import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DeleteLessonButton } from "@/components/draft/lesson/delete-lesson";
import { useRouter } from "next/navigation";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

describe("DeleteLessonButton", () => {
  const mockDeleteLesson = jest.fn();
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
  });

  it("renders a Delete Lesson button", () => {
    render(
      <DeleteLessonButton
        deleteLesson={mockDeleteLesson}
        dropletSlug="test-droplet"
      />,
    );

    expect(
      screen.getByRole("button", { name: "Delete lesson" }),
    ).toBeInTheDocument();
  });

  it("opens a confirmation dialog when clicked", () => {
    render(
      <DeleteLessonButton
        deleteLesson={mockDeleteLesson}
        dropletSlug="test-droplet"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete lesson" }));

    expect(
      screen.getByText(/Are you sure you want to delete this lesson?/),
    ).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(screen.getByText("Delete")).toBeInTheDocument();
  });

  it("calls deleteLesson when Delete is clicked in the dialog", async () => {
    render(
      <DeleteLessonButton
        deleteLesson={mockDeleteLesson}
        dropletSlug="test-droplet"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete lesson" }));

    fireEvent.click(screen.getByText("Delete"));

    expect(mockDeleteLesson).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/draft/d/test-droplet");
    });
  });

  it("does not call deleteLesson when Cancel is clicked", () => {
    render(
      <DeleteLessonButton
        deleteLesson={mockDeleteLesson}
        dropletSlug="test-droplet"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete lesson" }));

    fireEvent.click(screen.getByText("Cancel"));

    expect(mockDeleteLesson).not.toHaveBeenCalled();
  });

  it.each([
    ["succeeds", "resolve"],
    ["fails", "reject"],
  ] as const)(
    "shows a spinner while pending and recovers when delete %s",
    async (_label, settle) => {
      let resolve!: () => void;
      let reject!: (e: Error) => void;
      mockDeleteLesson.mockReturnValue(
        new Promise<void>((res, rej) => {
          resolve = res;
          reject = rej;
        }),
      );
      render(
        <DeleteLessonButton
          deleteLesson={mockDeleteLesson}
          dropletSlug="test-droplet"
        />,
      );
      fireEvent.click(screen.getByRole("button", { name: "Delete lesson" }));
      const confirm = screen.getByRole("button", { name: "Delete" });
      fireEvent.click(confirm);
      fireEvent.click(confirm);

      expect(mockDeleteLesson).toHaveBeenCalledTimes(1);
      const busy = screen.getByRole("button", { name: "Deleting..." });
      expect(busy).toBeDisabled();
      expect(busy).toHaveAttribute("aria-busy", "true");
      expect(busy.querySelector(".animate-spin")).not.toBeNull();
      expect(screen.getByText("Cancel")).toBeDisabled();

      if (settle === "resolve") resolve();
      else reject(new Error("boom"));

      const back = await screen.findByRole("button", { name: "Delete" });
      expect(back).toBeEnabled();
      expect(back.querySelector(".animate-spin")).toBeNull();
    },
  );
});
