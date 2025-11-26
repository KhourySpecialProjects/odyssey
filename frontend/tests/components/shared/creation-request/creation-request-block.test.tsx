import { render, screen, fireEvent } from "@testing-library/react";
import { CreationRequestBlock } from "@/components/shared/creation-request-manager/creation-request-block";
import { CreationRequest } from "@/types";

// Mock the CreationRequestModal component
jest.mock("@/components/shared/creation-request-manager/view-request", () => ({
  CreationRequestModal: jest.fn(({ isOpen, onClose }) =>
    isOpen ? (
      <div data-testid="creation-request-modal">
        <button onClick={onClose} data-testid="close-modal">
          Close
        </button>
      </div>
    ) : null,
  ),
}));

describe("CreationRequestBlock", () => {
  const mockRequest: CreationRequest = {
    id: 1,
    motivation: "I want to create educational content",
    dropletIdea: "React tutorial series",
    user: {
      id: 1,
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders user information correctly", () => {
    render(<CreationRequestBlock request={mockRequest} />);

    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("john.doe@example.com")).toBeInTheDocument();
  });

  it("renders view button", () => {
    render(<CreationRequestBlock request={mockRequest} />);

    const viewButton = screen.getByRole("button");
    expect(viewButton).toBeInTheDocument();
    expect(screen.getByText("View")).toBeInTheDocument();
  });

  it("opens modal when view button is clicked", () => {
    render(<CreationRequestBlock request={mockRequest} />);

    const viewButton = screen.getByRole("button", { name: /view/i });
    expect(
      screen.queryByTestId("creation-request-modal"),
    ).not.toBeInTheDocument();

    fireEvent.click(viewButton);

    expect(screen.getByTestId("creation-request-modal")).toBeInTheDocument();
  });

  it("closes modal when onClose is called", () => {
    render(<CreationRequestBlock request={mockRequest} />);

    // Open modal
    const viewButton = screen.getByRole("button", { name: /view/i });
    fireEvent.click(viewButton);
    expect(screen.getByTestId("creation-request-modal")).toBeInTheDocument();

    // Close modal
    const closeButton = screen.getByTestId("close-modal");
    fireEvent.click(closeButton);
    expect(
      screen.queryByTestId("creation-request-modal"),
    ).not.toBeInTheDocument();
  });

  it("renders with user having only first name", () => {
    const requestWithFirstNameOnly: CreationRequest = {
      ...mockRequest,
      user: {
        id: 1,
        firstName: "John",
        lastName: undefined as any,
        email: "john@example.com",
      },
    };

    render(<CreationRequestBlock request={requestWithFirstNameOnly} />);

    expect(screen.getByText(/John/)).toBeInTheDocument();
  });

  it("renders with user having only last name", () => {
    const requestWithLastNameOnly: CreationRequest = {
      ...mockRequest,
      user: {
        id: 1,
        firstName: undefined as any,
        lastName: "Doe",
        email: "doe@example.com",
      },
    };

    render(<CreationRequestBlock request={requestWithLastNameOnly} />);

    expect(screen.getByText(/Doe/)).toBeInTheDocument();
  });

  it("applies correct styling classes to container", () => {
    const { container } = render(
      <CreationRequestBlock request={mockRequest} />,
    );

    const listItem = container.querySelector("li");
    expect(listItem).toHaveClass(
      "flex",
      "items-center",
      "justify-between",
      "py-4",
    );
  });

  it("applies correct styling to view button", () => {
    render(<CreationRequestBlock request={mockRequest} />);

    const viewButton = screen.getByRole("button", { name: /view/i });
    expect(viewButton).toHaveClass("bg-blue-600", "hover:bg-blue-700");
  });

  it("renders AlignCenter icon within button", () => {
    const { container } = render(
      <CreationRequestBlock request={mockRequest} />,
    );

    const icon = container.querySelector("svg");
    expect(icon).toBeInTheDocument();
  });

  it("modal stays closed on initial render", () => {
    render(<CreationRequestBlock request={mockRequest} />);

    expect(
      screen.queryByTestId("creation-request-modal"),
    ).not.toBeInTheDocument();
  });

  it("handles multiple open/close cycles", () => {
    render(<CreationRequestBlock request={mockRequest} />);

    const viewButton = screen.getByRole("button", { name: /view/i });

    // First open
    fireEvent.click(viewButton);
    expect(screen.getByTestId("creation-request-modal")).toBeInTheDocument();

    // First close
    fireEvent.click(screen.getByTestId("close-modal"));
    expect(
      screen.queryByTestId("creation-request-modal"),
    ).not.toBeInTheDocument();

    // Second open
    fireEvent.click(viewButton);
    expect(screen.getByTestId("creation-request-modal")).toBeInTheDocument();

    // Second close
    fireEvent.click(screen.getByTestId("close-modal"));
    expect(
      screen.queryByTestId("creation-request-modal"),
    ).not.toBeInTheDocument();
  });

  it("renders email with correct styling", () => {
    const { container } = render(
      <CreationRequestBlock request={mockRequest} />,
    );

    const emailElement = screen.getByText("john.doe@example.com");
    expect(emailElement).toHaveClass(
      "text-sm",
      "text-gray-600",
      "dark:text-slate-400",
    );
  });

  it("renders name with correct styling", () => {
    const { container } = render(
      <CreationRequestBlock request={mockRequest} />,
    );

    const nameElement = screen.getByText("John Doe");
    expect(nameElement).toHaveClass("font-medium", "dark:text-slate-300");
  });
});
