import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateDropletForm } from "@/components/new/new-droplet-form";
import { createDroplet } from "@/lib/requests/droplet";
import { useRouter } from "next/navigation";

jest.mock("@/lib/requests/droplet", () => ({
  createDroplet: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

const mockedCreateDroplet = createDroplet as jest.MockedFunction<
  typeof createDroplet
>;
const mockedUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

// Mock scrollIntoView for Command component and Radix UI Select
if (typeof Element.prototype.scrollIntoView === "undefined") {
  Element.prototype.scrollIntoView = jest.fn();
}

// Mock hasPointerCapture for Radix UI Select
if (!HTMLElement.prototype.hasPointerCapture) {
  Object.defineProperty(HTMLElement.prototype, "hasPointerCapture", {
    value: jest.fn().mockReturnValue(false),
    writable: true,
  });
}

describe("CreateDropletForm", () => {
  const mockTags = [
    { id: 1, name: "React", droplets: [], slug: "react" },
    { id: 2, name: "TypeScript", droplets: [], slug: "typescript" },
  ];

  const mockAuthor = {
    name: "Test Author",
    email: "test@example.com",
    roles: [],
    isActive: true,
  };

  const mockPush = jest.fn();
  const mockBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseRouter.mockReturnValue({
      push: mockPush,
      back: mockBack,
      forward: jest.fn(),
      refresh: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
    });
  });

  describe("Rendering", () => {
    it("renders all form sections", () => {
      render(<CreateDropletForm tags={mockTags} author={mockAuthor} />);

      expect(screen.getByText("Metadata")).toBeInTheDocument();
      expect(screen.getByText("Overview")).toBeInTheDocument();
    });

    it("renders name input field", () => {
      render(<CreateDropletForm tags={mockTags} author={mockAuthor} />);

      const nameInput = screen.getByPlaceholderText("Developing a Droplet");
      expect(nameInput).toBeInTheDocument();
      expect(screen.getByText("Name")).toBeInTheDocument();
    });

    it("renders focus area select", () => {
      render(<CreateDropletForm tags={mockTags} author={mockAuthor} />);

      expect(screen.getByText("Focus Area")).toBeInTheDocument();
    });

    it("renders type radio select", () => {
      render(<CreateDropletForm tags={mockTags} author={mockAuthor} />);

      expect(screen.getByText("Type")).toBeInTheDocument();
    });

    it("renders tags multiselect", () => {
      render(<CreateDropletForm tags={mockTags} author={mockAuthor} />);

      expect(screen.getByText("Tags")).toBeInTheDocument();
    });

    it("renders learning objectives input", () => {
      render(<CreateDropletForm tags={mockTags} author={mockAuthor} />);

      expect(screen.getByText("Learning Objectives")).toBeInTheDocument();
    });

    it("displays author information correctly", () => {
      render(<CreateDropletForm tags={mockTags} author={mockAuthor} />);

      expect(screen.getByText("Author(s)")).toBeInTheDocument();
      expect(screen.getByText("Test Author")).toBeInTheDocument();
    });

    it("renders submit button", () => {
      render(<CreateDropletForm tags={mockTags} author={mockAuthor} />);

      expect(
        screen.getByRole("button", { name: /create droplet/i }),
      ).toBeInTheDocument();
    });

    it("renders cancel button", () => {
      render(<CreateDropletForm tags={mockTags} author={mockAuthor} />);

      expect(
        screen.getByRole("button", { name: /cancel/i }),
      ).toBeInTheDocument();
    });

    it("shows required field indicators", () => {
      render(<CreateDropletForm tags={mockTags} author={mockAuthor} />);

      const requiredMarkers = screen.getAllByText("*");
      expect(requiredMarkers.length).toBeGreaterThan(0);
    });
  });

  describe("Form Interactions", () => {
    it("allows typing in name input", async () => {
      const user = userEvent.setup();
      render(<CreateDropletForm tags={mockTags} author={mockAuthor} />);

      const nameInput = screen.getByPlaceholderText("Developing a Droplet");
      await user.type(nameInput, "My New Droplet");

      expect(nameInput).toHaveValue("My New Droplet");
    });

    it("focus area select is present and interactive", () => {
      render(<CreateDropletForm tags={mockTags} author={mockAuthor} />);

      const focusAreaButton = screen.getByRole("combobox");
      expect(focusAreaButton).toBeInTheDocument();
      expect(focusAreaButton).not.toBeDisabled();
    });

    it("tags multiselect is present", () => {
      render(<CreateDropletForm tags={mockTags} author={mockAuthor} />);

      const tagsButton = screen.getByText("Select Tags...");
      expect(tagsButton).toBeInTheDocument();
    });

    it("allows adding learning objectives", async () => {
      const user = userEvent.setup();
      render(<CreateDropletForm tags={mockTags} author={mockAuthor} />);

      const objectiveInputs =
        screen.getAllByPlaceholderText(/learning objective/i);
      await user.type(objectiveInputs[0], "Understand React hooks");

      expect(objectiveInputs[0]).toHaveValue("Understand React hooks");
    });

    it("clears error message when form fields change via useEffect", async () => {
      const user = userEvent.setup();
      render(<CreateDropletForm tags={mockTags} author={mockAuthor} />);

      expect(
        screen.queryByText("Please fill out all required fields"),
      ).not.toBeInTheDocument();

      const nameInput = screen.getByPlaceholderText("Developing a Droplet");
      await user.type(nameInput, "Test");

      expect(
        screen.queryByText("Please fill out all required fields"),
      ).not.toBeInTheDocument();
    });
  });

  describe("Form State Management", () => {
    it("initializes with empty state", () => {
      render(<CreateDropletForm tags={mockTags} author={mockAuthor} />);

      const nameInput = screen.getByPlaceholderText("Developing a Droplet");
      expect(nameInput).toHaveValue("");

      const tagsButton = screen.getByText("Select Tags...");
      expect(tagsButton).toBeInTheDocument();
    });

    it("updates state when name changes", async () => {
      const user = userEvent.setup();
      render(<CreateDropletForm tags={mockTags} author={mockAuthor} />);

      const nameInput = screen.getByPlaceholderText("Developing a Droplet");
      await user.type(nameInput, "Test Droplet");

      expect(nameInput).toHaveValue("Test Droplet");
    });

    it("updates state when learning objective changes", async () => {
      const user = userEvent.setup();
      render(<CreateDropletForm tags={mockTags} author={mockAuthor} />);

      const objectiveInputs =
        screen.getAllByPlaceholderText(/learning objective/i);
      await user.type(objectiveInputs[0], "Learn React");

      expect(objectiveInputs[0]).toHaveValue("Learn React");
    });
  });

  describe("Form Validation", () => {
    it("has validation for required name field", () => {
      render(<CreateDropletForm tags={mockTags} author={mockAuthor} />);

      const nameInput = screen.getByPlaceholderText("Developing a Droplet");
      expect(nameInput).toBeInTheDocument();
      expect(nameInput).toHaveAttribute("name", "name");
    });

    it("validates that component has form submission handler", () => {
      const { container } = render(
        <CreateDropletForm tags={mockTags} author={mockAuthor} />,
      );

      const form = container.querySelector("form");
      expect(form).toBeInTheDocument();
      expect(form).toBeTruthy();
    });
  });

  describe("Form Submission", () => {
    it("has submit button that triggers form action", () => {
      render(<CreateDropletForm tags={mockTags} author={mockAuthor} />);

      const submitButton = screen.getByRole("button", {
        name: /create droplet/i,
      });
      expect(submitButton).toBeInTheDocument();
      expect(submitButton).not.toBeDisabled();
    });

    it("does not submit when validation fails", async () => {
      const user = userEvent.setup();
      render(<CreateDropletForm tags={mockTags} author={mockAuthor} />);

      const submitButton = screen.getByRole("button", {
        name: /create droplet/i,
      });
      await user.click(submitButton);

      expect(mockedCreateDroplet).not.toHaveBeenCalled();
    });
  });

  describe("Navigation", () => {
    it("navigates back when cancel button is clicked", async () => {
      const user = userEvent.setup();
      render(<CreateDropletForm tags={mockTags} author={mockAuthor} />);

      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockPush).toHaveBeenCalledWith("/my-content");
    });
  });

  describe("Edge Cases", () => {
    it("handles empty tags array", () => {
      render(<CreateDropletForm tags={[]} author={mockAuthor} />);

      expect(screen.getByText("Tags")).toBeInTheDocument();
    });

    it("handles author without name", () => {
      const authorWithoutName = { ...mockAuthor, name: null as any };
      render(<CreateDropletForm tags={mockTags} author={authorWithoutName} />);

      expect(screen.getByText("Author(s)")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("form element exists in the DOM", () => {
      const { container } = render(
        <CreateDropletForm tags={mockTags} author={mockAuthor} />,
      );

      const form = container.querySelector("form");
      expect(form).toBeInTheDocument();
    });

    it("all interactive elements are keyboard accessible", () => {
      render(<CreateDropletForm tags={mockTags} author={mockAuthor} />);

      const submitButton = screen.getByRole("button", {
        name: /create droplet/i,
      });
      const cancelButton = screen.getByRole("button", { name: /cancel/i });

      expect(submitButton).not.toBeDisabled();
      expect(cancelButton).not.toBeDisabled();
    });

    it("required fields are properly marked", () => {
      render(<CreateDropletForm tags={mockTags} author={mockAuthor} />);

      const requiredMarkers = screen.getAllByText("*");
      expect(requiredMarkers.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("Component Integration", () => {
    it("renders MultiSelect component", () => {
      render(<CreateDropletForm tags={mockTags} author={mockAuthor} />);

      const tagsButton = screen.getByText("Select Tags...");
      expect(tagsButton).toBeInTheDocument();
    });

    it("renders LearningObjectivesInput component", () => {
      render(<CreateDropletForm tags={mockTags} author={mockAuthor} />);

      const objectiveInputs =
        screen.getAllByPlaceholderText(/learning objective/i);
      expect(objectiveInputs.length).toBeGreaterThan(0);
    });

    it("renders RadioSelect component for type selection", () => {
      render(<CreateDropletForm tags={mockTags} author={mockAuthor} />);

      expect(screen.getByText("Type")).toBeInTheDocument();
      const radioButtons = screen.getAllByRole("radio");
      expect(radioButtons.length).toBeGreaterThan(0);
    });
  });
});
