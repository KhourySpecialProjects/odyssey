import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DeleteBlockButton } from "@/components/draft/lesson/blocks/delete-block-button";

const deferred = () => {
  let resolve!: () => void;
  let reject!: (e: Error) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const spinner = (c: HTMLElement) => c.querySelector(".animate-spin");

describe("DeleteBlockButton", () => {
  beforeEach(() => jest.clearAllMocks());

  it("keeps its name and shows no spinner when idle", () => {
    const { container } = render(<DeleteBlockButton onDelete={jest.fn()} />);
    const button = screen.getByRole("button", { name: "Delete block" });
    expect(button).toBeEnabled();
    expect(button).toHaveAttribute("aria-busy", "false");
    expect(spinner(container)).toBeNull();
  });

  it("shows a spinner, disables, and ignores a second click while pending", async () => {
    const d = deferred();
    const onDelete = jest.fn(() => d.promise);
    const { container } = render(<DeleteBlockButton onDelete={onDelete} />);
    const button = screen.getByRole("button", { name: "Delete block" });

    fireEvent.click(button);
    fireEvent.click(button);

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(spinner(container)).not.toBeNull();

    d.resolve();
    await waitFor(() => expect(button).toBeEnabled());
    expect(spinner(container)).toBeNull();
  });

  it("returns to normal when the delete fails", async () => {
    const d = deferred();
    const { container } = render(
      <DeleteBlockButton onDelete={() => d.promise} />,
    );
    const button = screen.getByRole("button", { name: "Delete block" });

    fireEvent.click(button);
    expect(button).toBeDisabled();

    d.reject(new Error("boom"));
    await waitFor(() => expect(button).toBeEnabled());
    expect(spinner(container)).toBeNull();
  });
});
