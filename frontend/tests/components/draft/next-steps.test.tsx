import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NextSteps } from "@/components/draft/metadata/next-steps/next-steps";
import { updateDroplet } from "@/lib/requests/droplet";
import { toast } from "sonner";

jest.mock("@/lib/requests/droplet", () => ({
  updateDroplet: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

const mockHandleChange = jest.fn();
jest.mock("@/components/draft/metadata/hooks/useDropletUpdate", () => ({
  useDropletUpdate: () => ({
    error: null,
    handleChange: mockHandleChange,
  }),
}));

jest.mock("@/components/draft/metadata/next-steps/next-step", () => ({
  NextStepDisplay: ({ initial, remove }: any) => (
    <li data-testid={`next-step-${initial.id}`}>
      <div>{initial.label}</div>
      <div>{initial.url}</div>
      <button onClick={remove} data-testid={`remove-${initial.id}`}>
        Remove
      </button>
    </li>
  ),
}));

jest.mock("@/components/draft/metadata/form-buttons", () => ({
  AddButton: () => <button type="submit">Add</button>,
}));

describe("NextSteps", () => {
  const mockNextSteps = [
    { id: 1, label: "Step 1", url: "http://example.com/1" },
    { id: 2, label: "Step 2", url: "http://example.com/2" },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (updateDroplet as jest.Mock).mockResolvedValue({ data: true, error: null });
  });

  it("renders Learn More heading", () => {
    render(<NextSteps dropletId={1} nextSteps={mockNextSteps} />);
    expect(screen.getByText("Learn More")).toBeInTheDocument();
  });

  it("renders next steps list", () => {
    render(<NextSteps dropletId={1} nextSteps={mockNextSteps} />);
    expect(screen.getByText("Step 1")).toBeInTheDocument();
    expect(screen.getByText("Step 2")).toBeInTheDocument();
  });

  it("renders form inputs", () => {
    render(<NextSteps dropletId={1} nextSteps={mockNextSteps} />);
    expect(screen.getByPlaceholderText("URL")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Label")).toBeInTheDocument();
  });

  it("updates URL input value", () => {
    render(<NextSteps dropletId={1} nextSteps={mockNextSteps} />);
    const urlInput = screen.getByPlaceholderText("URL") as HTMLInputElement;
    fireEvent.change(urlInput, { target: { value: "https://new-url.com" } });
    expect(urlInput.value).toBe("https://new-url.com");
  });

  it("updates label input value", () => {
    render(<NextSteps dropletId={1} nextSteps={mockNextSteps} />);
    const labelInput = screen.getByPlaceholderText("Label") as HTMLInputElement;
    fireEvent.change(labelInput, { target: { value: "New Label" } });
    expect(labelInput.value).toBe("New Label");
  });

  it("removes first next step", async () => {
    render(<NextSteps dropletId={1} nextSteps={mockNextSteps} />);
    fireEvent.click(screen.getByTestId("remove-1"));
    await waitFor(() => {
      expect(updateDroplet).toHaveBeenCalledWith(1, {
        nextSteps: [{ label: "Step 2", url: "http://example.com/2" }],
      });
    });
  });

  it("removes second next step", async () => {
    render(<NextSteps dropletId={1} nextSteps={mockNextSteps} />);
    fireEvent.click(screen.getByTestId("remove-2"));
    await waitFor(() => {
      expect(updateDroplet).toHaveBeenCalledWith(1, {
        nextSteps: [{ label: "Step 1", url: "http://example.com/1" }],
      });
    });
  });

  it("renders with empty next steps", () => {
    render(<NextSteps dropletId={1} nextSteps={[]} />);
    expect(screen.getByText("Learn More")).toBeInTheDocument();
  });

  it("inputs have autocomplete off", () => {
    render(<NextSteps dropletId={1} nextSteps={mockNextSteps} />);
    expect(screen.getByPlaceholderText("URL")).toHaveAttribute(
      "autocomplete",
      "off",
    );
    expect(screen.getByPlaceholderText("Label")).toHaveAttribute(
      "autocomplete",
      "off",
    );
  });
});
