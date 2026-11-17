const UNCONFIRMED_MESSAGE =
  "This could not be confirmed. Reload to check whether it went through.";

/** A refused review action, as the message to show; `fallback` when it has no better one. */
export function reviewFailureMessage(
  result: { error: string; message?: string | null },
  fallback: string,
): string {
  if (result.error === "unconfirmed") return UNCONFIRMED_MESSAGE;
  if (result.error === "forbidden") return "You can't do this.";
  if (result.error === "unauthenticated") return "Please sign in again.";
  if (result.error === "rate_limited") {
    return (
      result.message || "You've used Score with AI too often. Try again later."
    );
  }
  return result.message || fallback;
}
