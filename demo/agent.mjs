// Runs one demo agent: Claude plays a demo persona on the demo site, in a
// real browser, until it finishes a goal or hits a limit.
//
//   npm run demo:agent -- student1 "Finish the Python Basics droplet, quizzes included"
//   npm run demo:agent -- student1 "..." --watch --max-dollars 1
//   npm run demo:agent -- student1 --script demo/agent-scripts/big-o-first-lesson.json
//
// Needs the demo frontend running, Node 22.18 or later (it runs the
// TypeScript in frontend/lib/demo-agent/ directly), and the demo's capped
// Anthropic API key in DEMO_AGENT_API_KEY, unless it replays a --script.
// Each run's log is saved in demo/.agent-runs/ (git-ignored).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { parseArgs } from "node:util";

const USAGE = `Usage: npm run demo:agent -- <persona> "<goal>" [options]

Options:
  --start <path>       Page to start on (default /explore)
  --max-steps <n>      Most actions it may take (default 60)
  --max-minutes <n>    Longest it may run (default 15)
  --max-dollars <n>    Most it may spend, estimated (default 3)
  --model <id>         Claude model (default claude-opus-5-5)
  --effort <level>     low, medium, high, xhigh or max (default medium)
  --watch              Show the browser window
  --browser <name>     chrome (default: the installed Google Chrome) or chromium
  --script <file>      Replay a script instead of calling Claude (no key, no cost)

Example:
  npm run demo:agent -- student1 "Finish the Python Basics droplet, quizzes included"`;

const EFFORTS = ["low", "medium", "high", "xhigh", "max"];
const OUTCOMES = {
  done: "Goal done",
  stuck: "Got stuck",
  step_limit: "Hit the step limit",
  time_limit: "Hit the time limit",
  budget: "Hit the spending limit",
  stopped: "Stopped",
  error: "Failed",
};

function fail(message) {
  console.error(message);
  process.exit(1);
}

let args;
try {
  args = parseArgs({
    allowPositionals: true,
    options: {
      start: { type: "string", default: "/explore" },
      "max-steps": { type: "string", default: "60" },
      "max-minutes": { type: "string", default: "15" },
      "max-dollars": { type: "string", default: "3" },
      model: { type: "string", default: "claude-opus-5-5" },
      effort: { type: "string", default: "medium" },
      watch: { type: "boolean", default: false },
      browser: { type: "string", default: "chrome" },
      script: { type: "string" },
      help: { type: "boolean", short: "h", default: false },
    },
  });
} catch (error) {
  fail(`${error.message}\n\n${USAGE}`);
}
const { values: options, positionals } = args;
if (options.help) {
  console.log(USAGE);
  process.exit(0);
}

const [who, goalArg] = positionals;
let script = null;
if (options.script) {
  try {
    script = JSON.parse(readFileSync(options.script, "utf8"));
  } catch (error) {
    fail(`Couldn't read the script ${options.script}: ${error.message}`);
  }
}
const goal = goalArg ?? script?.goal;
if (!who || !goal) fail(USAGE);

const number = (name) => {
  const value = Number(options[name]);
  if (!(value > 0)) fail(`--${name} must be a positive number.`);
  return value;
};
const limits = {
  maxSteps: number("max-steps"),
  maxMinutes: number("max-minutes"),
  maxDollars: number("max-dollars"),
};
if (!Number.isInteger(limits.maxSteps))
  fail("--max-steps must be a whole number.");
if (!EFFORTS.includes(options.effort)) {
  fail(`--effort must be one of ${EFFORTS.join(", ")}.`);
}
if (!options.start.startsWith("/"))
  fail("--start must be a path, like /explore.");

if (!process.features.typescript) {
  fail(
    "The agent runner needs Node 22.18 or later: it runs TypeScript files directly.",
  );
}
// demo/.env.agent (git-ignored) can hold DEMO_AGENT_API_KEY
const envFile = new URL("./.env.agent", import.meta.url);
if (existsSync(envFile)) process.loadEnvFile(envFile);
const { postControl } = await import("./control.mjs");

const require = createRequire(import.meta.url);
const { allPeople } = require("../backend/scripts/demo-seed/people.js");
const person = allPeople().find((p) => p.key === who || p.email === who);
if (!person) {
  const personas = allPeople()
    .filter((p) => p.isPersona)
    .map((p) => p.key);
  fail(
    `There's no demo persona called ${who}. Try ${personas.join(", ")}, or student4 to student45.`,
  );
}
const persona = {
  username: person.key,
  email: person.email,
  name: `${person.firstName} ${person.lastName}`,
  role: person.role ?? "Student",
  ...(person.bio ? { bio: person.bio } : {}),
};

const agentDir = new URL("../frontend/lib/demo-agent/", import.meta.url);
const load = (file) => import(new URL(file, agentDir).href);
const { runAgent, hasKnownPrice } = await load("agent.ts");
const { launchAgentBrowser } = await load("browser.ts");

let client;
if (script) {
  const { createScriptedClient } = await load("scripted-client.ts");
  client = createScriptedClient(Array.isArray(script) ? script : script.steps);
} else {
  const apiKey = process.env.DEMO_AGENT_API_KEY;
  if (!apiKey) {
    fail(
      "Set DEMO_AGENT_API_KEY to the demo's capped Anthropic API key, in demo/.env.agent or your shell. To try the runner without Claude, replay a --script.",
    );
  }
  const { createClaudeClient } = await load("claude.ts");
  client = createClaudeClient(apiKey);
  if (!hasKnownPrice(options.model)) {
    console.log(
      `Cost estimates assume Claude Opus 5.5 prices for ${options.model}.`,
    );
  }
}

let loginUrl;
try {
  ({ url: loginUrl } = await postControl("/api/demo/login-link", {
    email: persona.email,
    callbackUrl: options.start,
  }));
} catch (error) {
  fail(error.message);
}

let browser;
try {
  browser = await launchAgentBrowser({
    // The link's own address is the demo site the session cookie belongs to
    baseUrl: new URL(loginUrl).origin,
    headless: !options.watch,
    channel: options.browser,
  });
} catch (error) {
  fail(
    `Couldn't start the browser (${error.message.split("\n")[0]}). Install Google Chrome, or run npx playwright install chromium in frontend/ and pass --browser chromium.`,
  );
}

const controller = new AbortController();
process.on("SIGINT", () => {
  if (controller.signal.aborted) process.exit(130);
  console.log("\nStopping (press Ctrl+C again to quit right away)...");
  controller.abort();
});

const describeInput = (step) => {
  const input = step.input ?? {};
  if (step.tool === "go_to") return input.path;
  if (step.tool === "press_key") return input.key;
  if (step.tool === "type") return `"${String(input.text).slice(0, 40)}"`;
  return "";
};
const onStep = (step) => {
  const what =
    step.tool === "none"
      ? "(no action)"
      : [step.tool, step.target ?? describeInput(step)]
          .filter(Boolean)
          .join(" ");
  console.log(
    `${String(step.step).padStart(3)}  ${what}${step.why ? `  · ${step.why}` : ""}${step.page ? `  → ${step.page}` : ""}`,
  );
  if (step.error) console.log(`     ✗ ${step.error}`);
  for (const note of step.notes) console.log(`     ! ${note}`);
};

const config = {
  persona,
  goal,
  model: options.model,
  effort: options.effort,
  ...limits,
};
const startedAt = new Date();
console.log(
  `${persona.username}: ${goal}\n${script ? `Replaying ${options.script}` : `${options.model}, effort ${options.effort}`}. Limits: ${limits.maxSteps} steps, ${limits.maxMinutes} minutes, $${limits.maxDollars}. Ctrl+C stops it.\n`,
);

let result;
try {
  await browser.logIn(loginUrl);
  result = await runAgent({
    client,
    browser: browser.agentBrowser,
    config,
    onStep,
    signal: controller.signal,
  });
} catch (error) {
  result = {
    outcome: "error",
    summary: error.message,
    problems: [],
    steps: [],
    seconds: Math.round((Date.now() - startedAt) / 1000),
    usage: { input: 0, output: 0, cacheWrite: 0, cacheRead: 0 },
    dollars: 0,
  };
} finally {
  await browser.close().catch(() => {});
}

const runsDir = new URL("./.agent-runs/", import.meta.url);
mkdirSync(runsDir, { recursive: true });
const logFile = `${startedAt.toISOString().replace(/[:.]/g, "-")}-${persona.username}.json`;
writeFileSync(
  new URL(logFile, runsDir),
  `${JSON.stringify(
    {
      persona,
      goal,
      start: options.start,
      model: script ? "script" : options.model,
      effort: options.effort,
      limits,
      startedAt: startedAt.toISOString(),
      result,
    },
    null,
    2,
  )}\n`,
);

const { usage } = result;
const input = usage.input + usage.cacheWrite + usage.cacheRead;
const cached = input ? Math.round((usage.cacheRead / input) * 100) : 0;
const minutes = (result.seconds / 60).toFixed(1);
console.log(`\n${OUTCOMES[result.outcome]}: ${result.summary}`);
if (result.problems.length) {
  console.log("Problems it noticed:");
  for (const problem of result.problems) console.log(`  - ${problem}`);
}
console.log(
  script
    ? `${result.steps.length} steps in ${minutes} minutes (scripted, no cost).`
    : `${result.steps.length} steps in ${minutes} minutes, about $${result.dollars.toFixed(2)}: ${input.toLocaleString("en-US")} input tokens (${cached}% read from cache), ${usage.output.toLocaleString("en-US")} output.`,
);
console.log(`Log: demo/.agent-runs/${logFile}`);
process.exit(result.outcome === "done" ? 0 : 1);
