import type { ReviewActionError } from "@/lib/requests/reviews";

/** Why Score with AI refused to start, by the action's error code (ODY-814). */
export const START_ERRORS: Partial<Record<ReviewActionError, string>> = {
  conflict: "Score with AI is already running on your review.",
  review_closed: "Your review has been sent, so it can't be scored now.",
  not_in_review: "This droplet isn't in review.",
  forbidden: "Only a reviewer who isn't an author can use Score with AI.",
  rate_limited: "You've used Score with AI too often. Try again later.",
};

const START_FALLBACK = "Couldn't start Score with AI. Try again.";

/** The toast text for a refused start: the action's own message, else the mapped one. */
export function startErrorMessage(result: {
  error: ReviewActionError;
  message?: string | null;
}): string {
  return result.message ?? START_ERRORS[result.error] ?? START_FALLBACK;
}

export const START_FAILED = START_FALLBACK;
