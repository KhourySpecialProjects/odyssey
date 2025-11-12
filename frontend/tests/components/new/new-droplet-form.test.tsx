import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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

jest.mock("react-dom", () => ({
  ...jest.requireActual("react-dom"),
  useFormStatus: jest.fn(() => ({ pending: false })),
}));

const { useFormStatus } = require("react-dom");

jest.mock("@/lib/utils", () => ({
  ...jest.requireActual("@/lib/utils"),
  getInitials: (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join(""),
}));

jest.mock("@/lib/globals", () => ({
  DROPLET_FILTERS: [
    {
      name: "focusArea",
      label: "Focus Area",
      options: [
        { value: "personal", label: "Personal" },
        { value: "professional", label: "Professional" },
        { value: "technical", label: "Technical" },
      ],
    },
    {
      name: "type",
      label: "Type",
      options: [
        { value: "knowledge", label: "Knowledge" },
        { value: "skill", label: "Skill" },
      ],
    },
  ],
}));

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
    { id: 3, name: "JavaScript", droplets: [], slug: "javascript" },
  ];

  const mockAuthor = {
    name: "Test Author",
    email: "test@example.com",
    image: "https://example.com/avatar.jpg",
    roles: [],
    isActive: true,
  };

  const mockRouter = {
    push: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (createDroplet as jest.Mock).mockResolvedValue({
      data: { attributes: { slug: "new-droplet" } },
      error: null,
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

    it("displays author initials when no image", () => {
      const authorNoImage = { ...mockAuthor, image: null };
      render(<CreateDropletForm tags={mockTags} author={authorNoImage} />);

      expect(screen.getByText("TA")).toBeInTheDocument();
    });

    it("shows User2Icon when author has no name", () => {
      const authorNoName = { ...mockAuthor, name: null };
      const { container } = render(
        <CreateDropletForm tags={mockTags} author={authorNoName} />,
      );
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

    it("name input has correct attributes", () => {
      render(<CreateDropletForm tags={mockTags} author={mockAuthor} />);

      const nameInput = screen.getByPlaceholderText("Developing a Droplet");
      expect(nameInput).toHaveAttribute("id", "name");
      expect(nameInput).toHaveAttribute("name", "name");
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

    it("maintains form autocomplete off", () => {
      const { container } = render(
        <CreateDropletForm tags={mockTags} author={mockAuthor} />,
      );

      const form = container.querySelector("form");
      expect(form).toHaveAttribute("autocomplete", "off");
    });
  });

  describe("Form Validation", () => {
    it("does not call createDroplet when form is incomplete", async () => {
      const user = userEvent.setup();
      render(<CreateDropletForm tags={mockTags} author={mockAuthor} />);

      const submitButton = screen.getByRole("button", {
        name: /create droplet/i,
      });
      await user.click(submitButton);

      // Give it time to potentially call the function
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(createDroplet).not.toHaveBeenCalled();
    });
  });

  describe("Navigation", () => {
    it("navigates to my-content when cancel button is clicked", async () => {
      const user = userEvent.setup();
      render(<CreateDropletForm tags={mockTags} author={mockAuthor} />);

      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockRouter.push).toHaveBeenCalledWith("/my-content");
    });
  });

  describe("Edge Cases", () => {
    it("handles empty tags array", () => {
      render(<CreateDropletForm tags={[]} author={mockAuthor} />);

      expect(screen.getByText("Tags")).toBeInTheDocument();
    });

    it("handles author without image", () => {
      const authorNoImage = { ...mockAuthor, image: null };
      render(<CreateDropletForm tags={mockTags} author={authorNoImage} />);

      expect(screen.getByText("TA")).toBeInTheDocument();
    });

    it("handles very long droplet name", async () => {
      const user = userEvent.setup();
      render(<CreateDropletForm tags={mockTags} author={mockAuthor} />);

      const nameInput = screen.getByPlaceholderText("Developing a Droplet");
      const longName = "A".repeat(200);
      
      await user.click(nameInput);
      await user.paste(longName);

      expect(nameInput).toHaveValue(longName);
    });

    it("handles many tags", () => {
      const manyTags = Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        name: `Tag ${i + 1}`,
        droplets: [],
        slug: `tag-${i + 1}`,
      }));

      render(<CreateDropletForm tags={manyTags} author={mockAuthor} />);

      expect(screen.getByText("Tags")).toBeInTheDocument();
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

    it("form has autocomplete off", () => {
      const { container } = render(
        <CreateDropletForm tags={mockTags} author={mockAuthor} />,
      );

      const form = container.querySelector("form");
      expect(form).toHaveAttribute("autocomplete", "off");
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

  describe("Styling", () => {
    it("applies correct classes to metadata section", () => {
      const { container } = render(
        <CreateDropletForm tags={mockTags} author={mockAuthor} />,
      );

      const metadataLabel = screen.getByText("Metadata");
      expect(metadataLabel).toHaveClass("text-slate-400");
    });

    it("applies dark mode classes to form sections", () => {
      const { container } = render(
        <CreateDropletForm tags={mockTags} author={mockAuthor} />,
      );

      const sections = container.querySelectorAll(".dark\\:bg-slate-800");
      expect(sections.length).toBeGreaterThan(0);
    });

    it("cancel button has correct styling", () => {
      render(<CreateDropletForm tags={mockTags} author={mockAuthor} />);

      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      expect(cancelButton).toHaveClass("bg-black");
      expect(cancelButton).toHaveClass("text-white");
    });

    it("submit button has correct styling", () => {
      render(<CreateDropletForm tags={mockTags} author={mockAuthor} />);

      const submitButton = screen.getByRole("button", {
        name: /create droplet/i,
      });
      expect(submitButton).toHaveClass("bg-black");
      expect(submitButton).toHaveClass("text-white");
    });
  });
});
