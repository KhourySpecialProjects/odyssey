/**
 * The email behind a /prof/[username] URL. Profile links drop the email
 * domain, which is @northeastern.edu for real accounts and the reserved demo
 * domain in the demo environment. Some links keep the full email, so a
 * username that already has one is used as is.
 */
export function profileEmailFromUsername(username: string): string {
  const decoded = decodeURIComponent(username);
  if (decoded.includes("@")) return decoded;
  const domain =
    process.env.DEMO_MODE === "true" ? "demo.odyssey.test" : "northeastern.edu";
  return `${decoded}@${domain}`;
}
