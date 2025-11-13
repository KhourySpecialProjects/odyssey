import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { updateDroplet } from "@/lib/requests/droplet";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Droplet } from "@/types";
import { createPortal } from "react-dom";
import { PublishDropletButton } from "@/components/draft/metadata/publish-droplet";

// Mock dependencies
jest.mock("@/lib/requests/droplet");
jest.mock("sonner");
jest.mock("next/navigation");
jest.mock("react-dom", () => ({
  ...jest.requireActual("react-dom"),
  createPortal: jest.fn((element) => element),
}));

const mockPush = jest.fn();
const mockUpdateDroplet = updateDroplet as jest.MockedFunction<
  typeof updateDroplet
>;
const mockToast = {
  success: jest.fn(),
  error: jest.fn(),
};

(useRouter as jest.Mock).mockReturnValue({
  push: mockPush,
});

(toast.success as jest.Mock) = mockToast.success;
(toast.error as jest.Mock) = mockToast.error;

describe("PublishDropletButton", () => {
  const mockDroplet: Droplet = {
    id: 1,
    name: "Test Droplet",
    slug: "test-droplet",
    status: "draft",
    type: "knowledge",
    focusArea: "personal",
    isHidden: false,
    learningObjectives: [],
    inReview: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock document.body for createPortal
    document.body.innerHTML = '<div id="root"></div>';
  });

  it("renders the publish button", () => {
    render(<PublishDropletButton droplet={mockDroplet} />);

    const button = screen.getByRole("button", { name: /publish droplet/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass("bg-blue-400");
  });

  it("opens confirmation modal when button is clicked", () => {
    render(<PublishDropletButton droplet={mockDroplet} />);

    const button = screen.getByRole("button", { name: /publish droplet/i });
    fireEvent.click(button);

    expect(
      screen.getByText(/are you sure you want to publish this droplet/i),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Enter droplet name"),
    ).toBeInTheDocument();
  });

  it("closes modal when cancel button is clicked", () => {
    render(<PublishDropletButton droplet={mockDroplet} />);

    // Open modal
    const publishButton = screen.getByRole("button", {
      name: /publish droplet/i,
    });
    fireEvent.click(publishButton);

    // Click cancel
    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    fireEvent.click(cancelButton);

    // Modal should be closed
    expect(
      screen.queryByText(/are you sure you want to publish this droplet/i),
    ).not.toBeInTheDocument();
  });

  it("confirm button is disabled until droplet name is typed", async () => {
    const user = userEvent.setup();
    render(<PublishDropletButton droplet={mockDroplet} />);

    // Open modal
    const publishButton = screen.getByRole("button", {
      name: /publish droplet/i,
    });
    fireEvent.click(publishButton);

    const confirmButton = screen.getByRole("button", { name: /confirm/i });
    const input = screen.getByPlaceholderText("Enter droplet name");

    // Confirm button should be disabled initially
    expect(confirmButton).toBeDisabled();

    // Type incorrect name
    await user.type(input, "Wrong Name");
    expect(confirmButton).toBeDisabled();

    // Clear and type correct name
    await user.clear(input);
    await user.type(input, mockDroplet.name);

    await waitFor(() => {
      expect(confirmButton).not.toBeDisabled();
    });
  });

  it("calls updateDroplet with correct parameters when confirmed", async () => {
    const user = userEvent.setup();
    mockUpdateDroplet.mockResolvedValue({ ok: true, error: null } as any);

    render(<PublishDropletButton droplet={mockDroplet} />);

    // Open modal
    const publishButton = screen.getByRole("button", {
      name: /publish droplet/i,
    });
    fireEvent.click(publishButton);

    // Type droplet name
    const input = screen.getByPlaceholderText("Enter droplet name");
    await user.type(input, mockDroplet.name);

    // Confirm publish
    const confirmButton = screen.getByRole("button", { name: /confirm/i });
    await waitFor(() => expect(confirmButton).not.toBeDisabled());
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockUpdateDroplet).toHaveBeenCalledWith(
        mockDroplet.id,
        { name: mockDroplet.name, status: "published", inReview: false },
        { regenerateSlug: false },
      );
    });
  });

  it("shows success toast and redirects on successful publish", async () => {
    const user = userEvent.setup();
    mockUpdateDroplet.mockResolvedValue({ ok: true, error: null } as any);

    render(<PublishDropletButton droplet={mockDroplet} />);

    // Open modal
    fireEvent.click(screen.getByRole("button", { name: /publish droplet/i }));

    // Type droplet name
    const input = screen.getByPlaceholderText("Enter droplet name");
    await user.type(input, mockDroplet.name);

    // Confirm
    const confirmButton = screen.getByRole("button", { name: /confirm/i });
    await waitFor(() => expect(confirmButton).not.toBeDisabled());
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith(
        "Droplet published successfully!",
      );
      expect(mockPush).toHaveBeenCalledWith("/explore");
    });
  });

  it("shows error toast and closes modal on failed publish", async () => {
    const user = userEvent.setup();
    mockUpdateDroplet.mockResolvedValue({
      ok: false,
      error: "Network error",
    } as any);

    render(<PublishDropletButton droplet={mockDroplet} />);

    // Open modal
    fireEvent.click(screen.getByRole("button", { name: /publish droplet/i }));

    // Type droplet name
    const input = screen.getByPlaceholderText("Enter droplet name");
    await user.type(input, mockDroplet.name);

    // Confirm
    const confirmButton = screen.getByRole("button", { name: /confirm/i });
    await waitFor(() => expect(confirmButton).not.toBeDisabled());
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Error publishing droplet");
      expect(mockPush).not.toHaveBeenCalled();
    });

    // Modal should close
    await waitFor(() => {
      expect(
        screen.queryByText(/are you sure you want to publish this droplet/i),
      ).not.toBeInTheDocument();
    });
  });

  it("renders modal using createPortal", () => {
    render(<PublishDropletButton droplet={mockDroplet} />);

    // Open modal
    fireEvent.click(screen.getByRole("button", { name: /publish droplet/i }));

    expect(createPortal).toHaveBeenCalled();
  });

  it("applies correct dark mode classes to button", () => {
    render(<PublishDropletButton droplet={mockDroplet} />);

    const button = screen.getByRole("button", { name: /publish droplet/i });
    expect(button).toHaveClass("dark:bg-blue-600");
    expect(button).toHaveClass("dark:text-white");
    expect(button).toHaveClass("dark:hover:bg-blue-800");
  });

  it("applies correct light mode classes to button", () => {
    render(<PublishDropletButton droplet={mockDroplet} />);

    const button = screen.getByRole("button", { name: /publish droplet/i });
    expect(button).toHaveClass("bg-blue-400");
    expect(button).toHaveClass("text-black");
    expect(button).toHaveClass("hover:bg-blue-500");
  });

  it("button has correct styling classes", () => {
    render(<PublishDropletButton droplet={mockDroplet} />);

    const button = screen.getByRole("button", { name: /publish droplet/i });
    expect(button).toHaveClass("w-full");
    expect(button).toHaveClass("rounded-full");
    expect(button).toHaveClass("px-6");
    expect(button).toHaveClass("py-2");
    expect(button).toHaveClass("text-center");
    expect(button).toHaveClass("whitespace-nowrap");
  });

  it("does not render modal when not open", () => {
    render(<PublishDropletButton droplet={mockDroplet} />);

    expect(
      screen.queryByText(/are you sure you want to publish this droplet/i),
    ).not.toBeInTheDocument();
  });

  it("handles multiple open/close cycles", () => {
    render(<PublishDropletButton droplet={mockDroplet} />);

    const publishButton = screen.getByRole("button", {
      name: /publish droplet/i,
    });

    // Open and close first time
    fireEvent.click(publishButton);
    expect(
      screen.getByText(/are you sure you want to publish this droplet/i),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(
      screen.queryByText(/are you sure you want to publish this droplet/i),
    ).not.toBeInTheDocument();

    // Open and close second time
    fireEvent.click(publishButton);
    expect(
      screen.getByText(/are you sure you want to publish this droplet/i),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(
      screen.queryByText(/are you sure you want to publish this droplet/i),
    ).not.toBeInTheDocument();
  });

  it("resets input when modal is closed", async () => {
    const user = userEvent.setup();
    render(<PublishDropletButton droplet={mockDroplet} />);

    // Open modal and type
    fireEvent.click(screen.getByRole("button", { name: /publish droplet/i }));
    const input = screen.getByPlaceholderText("Enter droplet name");
    await user.type(input, "Some text");

    // Close modal
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    // Reopen modal
    fireEvent.click(screen.getByRole("button", { name: /publish droplet/i }));
    const newInput = screen.getByPlaceholderText("Enter droplet name");

    expect(newInput).toHaveValue("");
  });

  it("handles droplet with inReview set to true", async () => {
    const user = userEvent.setup();
    const dropletInReview: Droplet = {
      ...mockDroplet,
      inReview: true,
    };

    mockUpdateDroplet.mockResolvedValue({ ok: true, error: null } as any);

    render(<PublishDropletButton droplet={dropletInReview} />);

    fireEvent.click(screen.getByRole("button", { name: /publish droplet/i }));

    const input = screen.getByPlaceholderText("Enter droplet name");
    await user.type(input, dropletInReview.name);

    const confirmButton = screen.getByRole("button", { name: /confirm/i });
    await waitFor(() => expect(confirmButton).not.toBeDisabled());
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockUpdateDroplet).toHaveBeenCalledWith(
        dropletInReview.id,
        { name: dropletInReview.name, status: "published", inReview: false },
        { regenerateSlug: false },
      );
    });
  });

  it("handles different droplet types", () => {
    const skillDroplet: Droplet = {
      ...mockDroplet,
      type: "skill",
    };

    render(<PublishDropletButton droplet={skillDroplet} />);

    const button = screen.getByRole("button", { name: /publish droplet/i });
    expect(button).toBeInTheDocument();
  });

  it("handles different focus areas", () => {
    const professionalDroplet: Droplet = {
      ...mockDroplet,
      focusArea: "professional",
    };

    render(<PublishDropletButton droplet={professionalDroplet} />);

    const button = screen.getByRole("button", { name: /publish droplet/i });
    expect(button).toBeInTheDocument();
  });
});
