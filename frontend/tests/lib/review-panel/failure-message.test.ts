import { reviewFailureMessage } from "@/lib/review-panel/failure-message";

describe("reviewFailureMessage", () => {
  it.each([
    [
      "unconfirmed",
      "This could not be confirmed. Reload to check whether it went through.",
    ],
    ["forbidden", "You can't do this."],
    ["unauthenticated", "Please sign in again."],
  ])("maps %s to its fixed text", (error, text) => {
    expect(reviewFailureMessage({ error, message: "ignored" }, "fb")).toBe(
      text,
    );
  });

  it("passes the action's own message through", () => {
    expect(
      reviewFailureMessage(
        { error: "review_closed", message: "Already sent." },
        "fb",
      ),
    ).toBe("Already sent.");
  });

  it.each([undefined, null, ""])("falls back when the message is %p", (m) => {
    expect(reviewFailureMessage({ error: "failed", message: m }, "fb")).toBe(
      "fb",
    );
  });
});
