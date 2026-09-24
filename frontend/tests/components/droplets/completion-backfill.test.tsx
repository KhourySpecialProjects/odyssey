import { render } from "@testing-library/react";
import { CompletionBackfill } from "@/components/droplets/completion-backfill";
import { recordMissingCompletion } from "@/lib/requests/enrollment";

jest.mock("@/lib/requests/enrollment", () => ({
  recordMissingCompletion: jest.fn(),
}));

describe("CompletionBackfill", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (recordMissingCompletion as jest.Mock).mockResolvedValue({
      success: true,
      updated: true,
    });
  });

  it("records the missing completion once after mounting and renders nothing", () => {
    const { container, rerender } = render(
      <CompletionBackfill enrollmentId="42" />,
    );
    rerender(<CompletionBackfill enrollmentId="42" />);

    expect(container).toBeEmptyDOMElement();
    expect(recordMissingCompletion).toHaveBeenCalledTimes(1);
    expect(recordMissingCompletion).toHaveBeenCalledWith("42");
  });

  it("doesn't throw when the action rejects", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    (recordMissingCompletion as jest.Mock).mockRejectedValue(new Error("x"));

    render(<CompletionBackfill enrollmentId="42" />);
    await Promise.resolve();

    expect(recordMissingCompletion).toHaveBeenCalledTimes(1);
  });
});
