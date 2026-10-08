// Prints a one-time login link for a demo persona: it logs that persona in
// once and expires after 10 minutes. Handy for agents, and for opening a
// second persona in another browser. The demo frontend must be running.
//
//   npm run demo:login-link -- student1
//   npm run demo:login-link -- contenteditor1 /review
import { postControl } from "./control.mjs";

const [who, callbackUrl] = process.argv.slice(2);
if (!who) {
  console.error("Usage: npm run demo:login-link -- <persona> [path to open]");
  console.error("Example: npm run demo:login-link -- student1 /explore");
  process.exit(1);
}
const email = who.includes("@") ? who : `${who}@demo.odyssey.test`;

try {
  const { url, expiresAt } = await postControl("/api/demo/login-link", {
    email,
    callbackUrl,
  });
  console.log(url);
  console.error(
    `Logs in as ${email} once, until ${new Date(expiresAt).toLocaleTimeString()}.`,
  );
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
