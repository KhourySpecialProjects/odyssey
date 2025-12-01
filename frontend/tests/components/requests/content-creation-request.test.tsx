import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ContentCreatorRequestForm } from "@/components/requests/content-creation-request";
import { createCreationRequest } from "@/lib/actions";
import { AuthorizedUser } from "@/types";
import { toast } from "sonner";

// Mock the actions
jest.mock("@/lib/actions", () => ({
  createCreationRequest: jest.fn(),
}));

// Mock sonner toast
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock Next.js router
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    refresh: jest.fn(),
  })),
}));

describe("ContentCreatorRequestForm", () => {
  const mockUser: AuthorizedUser = {
    id: 1,
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
    roles: [],
    isEnabled: true,
    isPublic: false,
    linkedin: "",
    github: "",
    website: "",
    firstTime: false,
    bio: "",
    friendships: [],
    sent_requests: [],
    received_requests: [],
    profilePhoto: "",
    blocked: [],
    was_blocked: [],
    timeZone: "America/New_York",
    groups: undefined,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders form with all required elements", () => {
      render(<ContentCreatorRequestForm user={mockUser} />);

      expect(
        screen.getByText("Request Content Creator Role"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Why do you want to create?"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("What are some ideas you have for a droplet?"),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /submit request/i }),
      ).toBeInTheDocument();
    });

    it("renders textareas with correct placeholders", () => {
      render(<ContentCreatorRequestForm user={mockUser} />);

      expect(
        screen.getByPlaceholderText(
          /I want to create educational content because/i,
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText(/Some droplet ideas I have include/i),
      ).toBeInTheDocument();
    });

    it("renders character counters", () => {
      render(<ContentCreatorRequestForm user={mockUser} />);

      const counters = screen.getAllByText(/0 characters/i);
      expect(counters).toHaveLength(2);
    });

    it("renders submit button as disabled initially", () => {
      render(<ContentCreatorRequestForm user={mockUser} />);

      const submitButton = screen.getByRole("button", {
        name: /submit request/i,
      });
      expect(submitButton).toBeDisabled();
    });

    it("renders icons for each section", () => {
      const { container } = render(
        <ContentCreatorRequestForm user={mockUser} />,
      );

      const icons = container.querySelectorAll("svg");
      expect(icons.length).toBeGreaterThan(0);
    });
  });

  describe("Form Interaction", () => {
    it("updates motivation textarea on input", () => {
      render(<ContentCreatorRequestForm user={mockUser} />);

      const motivationTextarea = screen.getByPlaceholderText(
        /I want to create educational content because/i,
      );
      fireEvent.change(motivationTextarea, {
        target: { value: "My motivation" },
      });

      expect(motivationTextarea).toHaveValue("My motivation");
    });

    it("updates ideas textarea on input", () => {
      render(<ContentCreatorRequestForm user={mockUser} />);

      const ideasTextarea = screen.getByPlaceholderText(
        /Some droplet ideas I have include/i,
      );
      fireEvent.change(ideasTextarea, { target: { value: "My ideas" } });

      expect(ideasTextarea).toHaveValue("My ideas");
    });

    it("updates character counter for motivation", () => {
      render(<ContentCreatorRequestForm user={mockUser} />);

      const motivationTextarea = screen.getByPlaceholderText(
        /I want to create educational content because/i,
      );
      fireEvent.change(motivationTextarea, {
        target: { value: "Test motivation" },
      });

      expect(screen.getByText("15 characters")).toBeInTheDocument();
    });

    it("updates character counter for ideas", () => {
      render(<ContentCreatorRequestForm user={mockUser} />);

      const ideasTextarea = screen.getByPlaceholderText(
        /Some droplet ideas I have include/i,
      );
      fireEvent.change(ideasTextarea, { target: { value: "Test ideas" } });

      expect(screen.getByText("10 characters")).toBeInTheDocument();
    });

    it("enables submit button when both fields are filled", () => {
      render(<ContentCreatorRequestForm user={mockUser} />);

      const motivationTextarea = screen.getByPlaceholderText(
        /I want to create educational content because/i,
      );
      const ideasTextarea = screen.getByPlaceholderText(
        /Some droplet ideas I have include/i,
      );
      const submitButton = screen.getByRole("button", {
        name: /submit request/i,
      });

      expect(submitButton).toBeDisabled();

      fireEvent.change(motivationTextarea, {
        target: { value: "My motivation" },
      });
      fireEvent.change(ideasTextarea, { target: { value: "My ideas" } });

      expect(submitButton).not.toBeDisabled();
    });

    it("keeps submit button disabled if motivation is only whitespace", () => {
      render(<ContentCreatorRequestForm user={mockUser} />);

      const motivationTextarea = screen.getByPlaceholderText(
        /I want to create educational content because/i,
      );
      const ideasTextarea = screen.getByPlaceholderText(
        /Some droplet ideas I have include/i,
      );
      const submitButton = screen.getByRole("button", {
        name: /submit request/i,
      });

      fireEvent.change(motivationTextarea, { target: { value: "   " } });
      fireEvent.change(ideasTextarea, { target: { value: "My ideas" } });

      expect(submitButton).toBeDisabled();
    });

    it("keeps submit button disabled if ideas is only whitespace", () => {
      render(<ContentCreatorRequestForm user={mockUser} />);

      const motivationTextarea = screen.getByPlaceholderText(
        /I want to create educational content because/i,
      );
      const ideasTextarea = screen.getByPlaceholderText(
        /Some droplet ideas I have include/i,
      );
      const submitButton = screen.getByRole("button", {
        name: /submit request/i,
      });

      fireEvent.change(motivationTextarea, {
        target: { value: "My motivation" },
      });
      fireEvent.change(ideasTextarea, { target: { value: "   " } });

      expect(submitButton).toBeDisabled();
    });
  });

  describe("Form Submission", () => {
    it("calls createCreationRequest with correct data on submit", async () => {
      (createCreationRequest as jest.Mock).mockResolvedValue({ ok: true });

      render(<ContentCreatorRequestForm user={mockUser} />);

      const motivationTextarea = screen.getByPlaceholderText(
        /I want to create educational content because/i,
      );
      const ideasTextarea = screen.getByPlaceholderText(
        /Some droplet ideas I have include/i,
      );
      const submitButton = screen.getByRole("button", {
        name: /submit request/i,
      });

      fireEvent.change(motivationTextarea, {
        target: { value: "My motivation" },
      });
      fireEvent.change(ideasTextarea, { target: { value: "My ideas" } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(createCreationRequest).toHaveBeenCalledWith({
          motivation: "My motivation",
          dropletIdea: "My ideas",
          user: 1,
        });
      });
    });

    it("displays success toast on successful submission", async () => {
      (createCreationRequest as jest.Mock).mockResolvedValue({ ok: true });

      render(<ContentCreatorRequestForm user={mockUser} />);

      const motivationTextarea = screen.getByPlaceholderText(
        /I want to create educational content because/i,
      );
      const ideasTextarea = screen.getByPlaceholderText(
        /Some droplet ideas I have include/i,
      );
      const submitButton = screen.getByRole("button", {
        name: /submit request/i,
      });

      fireEvent.change(motivationTextarea, {
        target: { value: "My motivation" },
      });
      fireEvent.change(ideasTextarea, { target: { value: "My ideas" } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          "Request submitted successfully!",
        );
      });
    });

    it("clears form on successful submission", async () => {
      (createCreationRequest as jest.Mock).mockResolvedValue({ ok: true });

      render(<ContentCreatorRequestForm user={mockUser} />);

      const motivationTextarea = screen.getByPlaceholderText(
        /I want to create educational content because/i,
      ) as HTMLTextAreaElement;
      const ideasTextarea = screen.getByPlaceholderText(
        /Some droplet ideas I have include/i,
      ) as HTMLTextAreaElement;
      const submitButton = screen.getByRole("button", {
        name: /submit request/i,
      });

      fireEvent.change(motivationTextarea, {
        target: { value: "My motivation" },
      });
      fireEvent.change(ideasTextarea, { target: { value: "My ideas" } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(motivationTextarea.value).toBe("");
        expect(ideasTextarea.value).toBe("");
      });
    });

    it("displays error toast on submission failure", async () => {
      (createCreationRequest as jest.Mock).mockResolvedValue({
        ok: false,
        error: "Validation failed",
      });

      render(<ContentCreatorRequestForm user={mockUser} />);

      const motivationTextarea = screen.getByPlaceholderText(
        /I want to create educational content because/i,
      );
      const ideasTextarea = screen.getByPlaceholderText(
        /Some droplet ideas I have include/i,
      );
      const submitButton = screen.getByRole("button", {
        name: /submit request/i,
      });

      fireEvent.change(motivationTextarea, {
        target: { value: "My motivation" },
      });
      fireEvent.change(ideasTextarea, { target: { value: "My ideas" } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Failed to submit request: Validation failed",
        );
      });
    });

    it("displays error toast on network exception", async () => {
      const consoleError = jest.spyOn(console, "error").mockImplementation();
      (createCreationRequest as jest.Mock).mockRejectedValue(
        new Error("Network error"),
      );

      render(<ContentCreatorRequestForm user={mockUser} />);

      const motivationTextarea = screen.getByPlaceholderText(
        /I want to create educational content because/i,
      );
      const ideasTextarea = screen.getByPlaceholderText(
        /Some droplet ideas I have include/i,
      );
      const submitButton = screen.getByRole("button", {
        name: /submit request/i,
      });

      fireEvent.change(motivationTextarea, {
        target: { value: "My motivation" },
      });
      fireEvent.change(ideasTextarea, { target: { value: "My ideas" } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Failed to submit request. Please try again.",
        );
        expect(consoleError).toHaveBeenCalledWith(
          "Submission error:",
          expect.any(Error),
        );
      });

      consoleError.mockRestore();
    });

    it("displays error toast when user is undefined", async () => {
      render(<ContentCreatorRequestForm user={undefined} />);

      const motivationTextarea = screen.getByPlaceholderText(
        /I want to create educational content because/i,
      );
      const ideasTextarea = screen.getByPlaceholderText(
        /Some droplet ideas I have include/i,
      );
      const submitButton = screen.getByRole("button", {
        name: /submit request/i,
      });

      fireEvent.change(motivationTextarea, {
        target: { value: "My motivation" },
      });
      fireEvent.change(ideasTextarea, { target: { value: "My ideas" } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "You must be logged in to submit a request.",
        );
      });
      expect(createCreationRequest).not.toHaveBeenCalled();
    });

    it("displays error toast when user has no id", async () => {
      const userWithoutId = { ...mockUser, id: undefined as any };
      render(<ContentCreatorRequestForm user={userWithoutId} />);

      const motivationTextarea = screen.getByPlaceholderText(
        /I want to create educational content because/i,
      );
      const ideasTextarea = screen.getByPlaceholderText(
        /Some droplet ideas I have include/i,
      );
      const submitButton = screen.getByRole("button", {
        name: /submit request/i,
      });

      fireEvent.change(motivationTextarea, {
        target: { value: "My motivation" },
      });
      fireEvent.change(ideasTextarea, { target: { value: "My ideas" } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "You must be logged in to submit a request.",
        );
      });
      expect(createCreationRequest).not.toHaveBeenCalled();
    });

    it("disables submit button during submission", async () => {
      (createCreationRequest as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ ok: true }), 100),
          ),
      );

      render(<ContentCreatorRequestForm user={mockUser} />);

      const motivationTextarea = screen.getByPlaceholderText(
        /I want to create educational content because/i,
      );
      const ideasTextarea = screen.getByPlaceholderText(
        /Some droplet ideas I have include/i,
      );
      const submitButton = screen.getByRole("button", {
        name: /submit request/i,
      });

      fireEvent.change(motivationTextarea, {
        target: { value: "My motivation" },
      });
      fireEvent.change(ideasTextarea, { target: { value: "My ideas" } });
      fireEvent.click(submitButton);

      expect(submitButton).toBeDisabled();

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalled();
      });
    });

    it("shows submitting state during submission", async () => {
      (createCreationRequest as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ ok: true }), 100),
          ),
      );

      render(<ContentCreatorRequestForm user={mockUser} />);

      const motivationTextarea = screen.getByPlaceholderText(
        /I want to create educational content because/i,
      );
      const ideasTextarea = screen.getByPlaceholderText(
        /Some droplet ideas I have include/i,
      );
      const submitButton = screen.getByRole("button", {
        name: /submit request/i,
      });

      fireEvent.change(motivationTextarea, {
        target: { value: "My motivation" },
      });
      fireEvent.change(ideasTextarea, { target: { value: "My ideas" } });
      fireEvent.click(submitButton);

      expect(screen.getByText("Submitting Request...")).toBeInTheDocument();

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalled();
      });
    });
  });

  describe("Styling", () => {
    it("applies correct styling classes to card", () => {
      const { container } = render(
        <ContentCreatorRequestForm user={mockUser} />,
      );

      const card = container.querySelector('[class*="border-gray-200"]');
      expect(card).toBeInTheDocument();
    });

    it("applies correct styling to textareas", () => {
      render(<ContentCreatorRequestForm user={mockUser} />);

      const motivationTextarea = screen.getByPlaceholderText(
        /I want to create educational content because/i,
      );
      expect(motivationTextarea).toHaveClass("min-h-[120px]", "resize-none");
    });
  });
});
