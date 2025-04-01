import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { EnrollButton } from "@/components/droplets/enroll-button";
import { createEnrollment, deleteEnrollment } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

jest.mock("@/lib/actions", () => ({
  createEnrollment: jest.fn(),
  deleteEnrollment: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), promise: jest.fn() },
}));

describe("EnrollButton", () => {
  const mockDroplet = {
    id: 1,
    name: "Test Droplet",
    slug: "test-droplet",
    lessons: [{ slug: "lesson-1" }],
  };

  const mockRouter = { push: jest.fn() };

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    jest.clearAllMocks();
  });

  it("handles enrollment", async () => {
    (createEnrollment as jest.Mock).mockResolvedValue({ ok: true });

    render(<EnrollButton droplet={mockDroplet as any} />);
    await fireEvent.click(screen.getByRole("button"));
    expect(createEnrollment).toHaveBeenCalledWith(mockDroplet, []);
    expect(toast.success).toHaveBeenCalled();

    expect(mockRouter.push).toHaveBeenCalledWith("/d/test-droplet/lesson-1");
  });

  it("handles unenrollment", async () => {
    render(<EnrollButton droplet={mockDroplet as any} isEnrolled={true} />);
    fireEvent.click(screen.getByText("Unenroll"));

    expect(deleteEnrollment).toHaveBeenCalled();
    expect(toast.promise).toHaveBeenCalled();
  });

  it("returns null if no lessons are available", () => {
    const { container } = render(
      <EnrollButton droplet={{ ...(mockDroplet as any), lessons: [] }} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("handles successful enrollment", async () => {
    (createEnrollment as jest.Mock).mockResolvedValue({ ok: true });

    render(<EnrollButton droplet={mockDroplet as any} />);

    const button = screen.getByRole("button");
    await fireEvent.click(button);

    await waitFor(() => {
      expect(createEnrollment).toHaveBeenCalledWith(mockDroplet, []);
      expect(toast.success).toHaveBeenCalledWith(
        `You are now enrolled in ${mockDroplet.name}!`,
      );
      expect(mockRouter.push).toHaveBeenCalledWith("/d/test-droplet/lesson-1");
    });
  });

  it("handles successful unenrollment", async () => {
    (deleteEnrollment as jest.Mock).mockResolvedValue({ ok: true });

    render(<EnrollButton droplet={mockDroplet as any} isEnrolled={true} />);

    const button = screen.getByRole("button", { name: /unenroll/i });
    await fireEvent.click(button);

    await waitFor(() => {
      expect(toast.promise).toHaveBeenCalledWith(
        expect.any(Promise),
        expect.objectContaining({
          success: expect.any(Function),
        }),
      );

      const { success } = (toast.promise as jest.Mock).mock.calls[0][1];
      expect(success()).toBe(
        `You are now unenrolled from ${mockDroplet.name}!`,
      );
    });
  });

  it("handles enrollment failure with error response", async () => {
    (createEnrollment as jest.Mock).mockResolvedValue({ ok: false });

    render(<EnrollButton droplet={mockDroplet as any} />);

    const button = screen.getByRole("button", { name: /enroll/i });
    await fireEvent.click(button);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Uh oh! Something went wrong.");
    });
  });
});
