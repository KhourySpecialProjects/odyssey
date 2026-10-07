// Starts Piston (the code runner in docker-compose.yml) and installs the
// runtimes the demo's code blocks use, so non-Python code blocks can run.
// Python runs in the browser and doesn't need this.
// Usage: npm run demo:piston
import { execSync } from "node:child_process";

const PISTON = "http://127.0.0.1:2000/api/v2";
// Piston's language -> version to install. The Block Gallery only needs JavaScript.
const RUNTIMES = { node: "18.15.0" };

execSync("docker compose up -d piston", { stdio: "inherit" });

let runtimes;
for (let attempt = 0; !runtimes; attempt++) {
  try {
    runtimes = await (await fetch(`${PISTON}/runtimes`)).json();
  } catch {
    if (attempt === 30) throw new Error("Piston didn't start on port 2000");
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}

for (const [language, version] of Object.entries(RUNTIMES)) {
  if (runtimes.some((r) => r.runtime === language || r.language === language)) {
    console.log(`${language} is already installed`);
    continue;
  }
  console.log(
    `Installing ${language} ${version} (takes a minute the first time)...`,
  );
  const res = await fetch(`${PISTON}/packages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ language, version }),
  });
  if (!res.ok)
    throw new Error(`Installing ${language} failed: ${await res.text()}`);
}

console.log(
  "\nPiston is ready. The demo frontend reaches it through PISTON_API_URL in\n" +
    `frontend/.env.demo, which should be ${PISTON.replace("127.0.0.1", "localhost")}/execute.`,
);
