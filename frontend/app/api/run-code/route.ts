import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";

// Two supported upstreams, env-selected:
//   1. Judge0 (hosted, e.g. RapidAPI) — set JUDGE0_API_URL + JUDGE0_API_KEY.
//      No infra needed. Free RapidAPI tier ≈ 50 req/day; paid plans go higher.
//   2. Piston (self-hosted or whitelisted) — set PISTON_API_URL.
//      Unlimited within your container budget; needs a privileged EC2.
// Judge0 wins if both are set. When neither is set, non-Python execution
// returns 503 and Python continues to work in-browser via Pyodide.
const JUDGE0_URL = process.env.JUDGE0_API_URL ?? "";
const JUDGE0_KEY = process.env.JUDGE0_API_KEY ?? "";
const PISTON_URL = process.env.PISTON_API_URL ?? "";

const MAX_CODE_BYTES = 50_000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;
const UPSTREAM_TIMEOUT_MS = 15_000;

// Allowlist of language identifiers exposed to clients. Keep in sync with
// code-block.tsx. These strings are *also* the Piston language names.
const ALLOWED_LANGUAGES = new Set([
  "javascript",
  "typescript",
  "python",
  "java",
  "c++",
  "c",
  "csharp",
  "php",
  "ruby",
  "bash",
  "go",
  "rust",
  "kotlin",
  "swift",
]);

// Judge0 CE language IDs (https://ce.judge0.com/languages).
const JUDGE0_LANGUAGE_IDS: Record<string, number> = {
  javascript: 63, // Node.js 12.14.0
  typescript: 74, // 3.7.4
  python: 71, // 3.8.1
  java: 62, // OpenJDK 13.0.1
  "c++": 54, // GCC 9.2.0
  c: 50, // GCC 9.2.0
  csharp: 51, // Mono 6.6.0.161
  php: 68, // 7.4.1
  ruby: 72, // 2.7.0
  bash: 46, // 5.0.0
  go: 60, // 1.13.5
  rust: 73, // 1.40.0
  kotlin: 78, // 1.3.70
  swift: 83, // 5.2.3
};

// Must start with an alphanumeric/underscore; no path traversal.
const ALLOWED_FILENAME = /^[a-zA-Z0-9_][a-zA-Z0-9_.-]{0,63}$/;

// Per-task in-memory rate limit. ECS may run multiple tasks, so the effective
// limit is N * RATE_LIMIT_MAX/min — fine as a friction layer, not a hard cap.
const hits = new Map<string, number[]>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  // Opportunistic sweep so the map doesn't grow forever as users come and go.
  for (const [k, ts] of hits) {
    const fresh = ts.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
    if (fresh.length === 0) hits.delete(k);
    else if (fresh.length !== ts.length) hits.set(k, fresh);
  }
  const recent = hits.get(key) ?? [];
  if (recent.length >= RATE_LIMIT_MAX) return true;
  recent.push(now);
  hits.set(key, recent);
  return false;
}

// Normalize provider responses into Piston's response shape so the existing
// client (code-block.tsx) doesn't need to know which upstream ran.
type NormalizedRun = {
  compile?: { code: number; stdout: string; stderr: string; output: string };
  run: { code: number; stdout: string; stderr: string; output: string };
  language: string;
};

async function runViaJudge0(
  language: string,
  code: string,
): Promise<NormalizedRun> {
  const langId = JUDGE0_LANGUAGE_IDS[language];
  if (!langId) throw new Error(`No Judge0 ID for ${language}`);

  const url = new URL(JUDGE0_URL);
  url.searchParams.set("base64_encoded", "true");
  url.searchParams.set("wait", "true");

  // Judge0 RapidAPI uses x-rapidapi-* headers; self-hosted uses neither.
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (JUDGE0_KEY) {
    headers["x-rapidapi-key"] = JUDGE0_KEY;
    try {
      headers["x-rapidapi-host"] = new URL(JUDGE0_URL).host;
    } catch {
      // ignore — let upstream URL validation fail noisily
    }
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      source_code: Buffer.from(code, "utf8").toString("base64"),
      language_id: langId,
      stdin: "",
    }),
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`judge0 ${res.status}`);

  const j = (await res.json()) as {
    stdout?: string | null;
    stderr?: string | null;
    compile_output?: string | null;
    status?: { id?: number; description?: string };
    message?: string | null;
  };

  const decode = (s: string | null | undefined) =>
    s ? Buffer.from(s, "base64").toString("utf8") : "";
  const stdout = decode(j.stdout);
  const stderr = decode(j.stderr);
  const compileOut = decode(j.compile_output);
  const statusId = j.status?.id ?? 0;
  // Judge0 status: 3 = Accepted; 6 = Compilation Error; 11/12 = runtime errors.
  const compileFailed = statusId === 6;
  const runFailed = statusId !== 3 && !compileFailed;
  return {
    compile: compileFailed
      ? { code: 1, stdout: "", stderr: compileOut, output: compileOut }
      : { code: 0, stdout: "", stderr: "", output: "" },
    run: {
      code: runFailed ? 1 : 0,
      stdout,
      stderr: stderr || (runFailed ? j.status?.description ?? "" : ""),
      output: stdout,
    },
    language,
  };
}

async function runViaPiston(
  language: string,
  code: string,
  fileName: string,
): Promise<NormalizedRun> {
  const res = await fetch(PISTON_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "odyssey-khoury/1.0 (+https://khouryodyssey.org)",
    },
    body: JSON.stringify({
      language,
      version: "*",
      files: [{ name: fileName, content: code }],
      stdin: "",
      args: [],
      compile_timeout: 10000,
      run_timeout: 3000,
    }),
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`piston ${res.status}`);
  return (await res.json()) as NormalizedRun;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (rateLimited(session.user.email)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again in a minute." },
        { status: 429 },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { language, code, fileName } = (body ?? {}) as {
      language?: unknown;
      code?: unknown;
      fileName?: unknown;
    };

    if (typeof language !== "string" || !ALLOWED_LANGUAGES.has(language)) {
      return NextResponse.json(
        { error: "Unsupported language" },
        { status: 400 },
      );
    }
    if (typeof code !== "string") {
      return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    }
    if (Buffer.byteLength(code, "utf8") > MAX_CODE_BYTES) {
      return NextResponse.json({ error: "Code too large" }, { status: 413 });
    }
    if (
      typeof fileName !== "string" ||
      !ALLOWED_FILENAME.test(fileName) ||
      fileName.includes("..")
    ) {
      return NextResponse.json({ error: "Invalid file name" }, { status: 400 });
    }

    const useJudge0 = !!JUDGE0_URL;
    const usePiston = !useJudge0 && !!PISTON_URL;
    if (!useJudge0 && !usePiston) {
      return NextResponse.json(
        {
          error:
            "Code execution for this language is currently unavailable. Python runs in your browser; other languages require a configured execution backend.",
        },
        { status: 503 },
      );
    }

    let result: NormalizedRun;
    try {
      result = useJudge0
        ? await runViaJudge0(language, code)
        : await runViaPiston(language, code, fileName);
    } catch (err) {
      const isAbort = err instanceof Error && err.name === "TimeoutError";
      return NextResponse.json(
        {
          error: isAbort
            ? "Execution timed out"
            : "Execution service unreachable",
        },
        { status: isAbort ? 504 : 502 },
      );
    }

    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
