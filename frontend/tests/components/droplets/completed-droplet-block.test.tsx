import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CompletedDropletBlock } from "@/components/droplets/completed-droplet-block";
import { createFriendAnnouncement } from "@/lib/requests/feed";
import { updateEnrollmentFirstTime } from "@/lib/requests/enrollment";
import { expectSingleCloseButton } from "@/testing/helpers/dialog";

jest.mock("@/lib/requests/enrollment", () => ({
  updateEnrollmentFirstTime: jest.fn(),
}));

jest.mock("@/lib/requests/feed", () => ({
  createFriendAnnouncement: jest.fn(),
}));

jest.mock("@/components/gradient-bg", () => ({
  GradientBackground: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
}));

describe("CompletedDropletBlock", () => {
  const mockDroplet = {
    id: 1,
    name: "Test Droplet",
    slug: "test-droplet",
  };

  const mockEnrollment = {
    id: "enrollment-123",
    isFirstTime: true,
  };

  const mockAuthUser = {
    id: 1,
    email: "test@test.com",
    firstName: "Test",
    lastName: "User",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (updateEnrollmentFirstTime as jest.Mock).mockResolvedValue({});
    (createFriendAnnouncement as jest.Mock).mockResolvedValue({});
  });

  it("renders completion message with droplet name", () => {
    render(
      <CompletedDropletBlock
        droplet={mockDroplet as any}
        enrollment={mockEnrollment as any}
        authUser={mockAuthUser as any}
      />,
    );

    expect(screen.getByText(/Congratulations/)).toBeInTheDocument();
    expect(screen.getByText(/Test Droplet/)).toBeInTheDocument();
    expect(screen.getByText(/You did it!/)).toBeInTheDocument();
  });

  it("shows dialog when isFirstTime is true", () => {
    render(
      <CompletedDropletBlock
        droplet={mockDroplet as any}
        enrollment={mockEnrollment as any}
        authUser={mockAuthUser as any}
      />,
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("does not show dialog when isFirstTime is false", () => {
    const notFirstTime = { ...mockEnrollment, isFirstTime: false };

    render(
      <CompletedDropletBlock
        droplet={mockDroplet as any}
        enrollment={notFirstTime as any}
        authUser={mockAuthUser as any}
      />,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders Share with friends button", () => {
    render(
      <CompletedDropletBlock
        droplet={mockDroplet as any}
        enrollment={mockEnrollment as any}
        authUser={mockAuthUser as any}
      />,
    );

    expect(screen.getByText("Share with friends")).toBeInTheDocument();
  });

  it("share button is not disabled", () => {
    render(
      <CompletedDropletBlock
        droplet={mockDroplet as any}
        enrollment={mockEnrollment as any}
        authUser={mockAuthUser as any}
      />,
    );

    const shareButton = screen.getByText("Share with friends");
    expect(shareButton).not.toBeDisabled();
  });

  it("handles droplet with special characters in name", () => {
    const specialDroplet = {
      ...mockDroplet,
      name: "Droplet & <Special> Characters",
    };

    render(
      <CompletedDropletBlock
        droplet={specialDroplet as any}
        enrollment={mockEnrollment as any}
        authUser={mockAuthUser as any}
      />,
    );

    expect(
      screen.getByText(/Droplet & <Special> Characters/),
    ).toBeInTheDocument();
  });

  it("has a single close button that marks the enrollment as seen", async () => {
    render(
      <CompletedDropletBlock
        droplet={mockDroplet as any}
        enrollment={mockEnrollment as any}
        authUser={mockAuthUser as any}
      />,
    );

    expectSingleCloseButton(screen.getByRole("dialog"));
    fireEvent.click(screen.getByRole("button", { name: /close/i }));

    await waitFor(() => {
      expect(updateEnrollmentFirstTime).toHaveBeenCalledWith("enrollment-123");
    });
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});
