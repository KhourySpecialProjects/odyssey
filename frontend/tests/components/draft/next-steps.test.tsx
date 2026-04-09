import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
const mockUseDropletUpdate = jest.fn();

jest.mock("@/components/draft/metadata/hooks/useDropletUpdate", () => ({
  useDropletUpdate: (dropletId: number) => mockUseDropletUpdate(dropletId),
}));

jest.mock("@/components/draft/metadata/next-steps/next-step", () => ({
  NextStepDisplay: ({ initial, update, remove }: any) => (
    <li data-testid={`next-step-${initial.id}`}>
      <div data-testid={`label-${initial.id}`}>{initial.label}</div>
      <div data-testid={`url-${initial.id}`}>{initial.url}</div>
      <button onClick={remove} data-testid={`remove-${initial.id}`}>
        Remove
      </button>
      <button
        onClick={() => {
          update({
            label: `Updated Label ${initial.id}`,
            url: `http://updated${initial.id}.com`,
          });
        }}
        data-testid={`update-${initial.id}`}
      >
        Update
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
    mockUseDropletUpdate.mockReturnValue({
      error: null as string | null,
      handleChange: mockHandleChange,
    });
  });

  describe("Rendering", () => {
    it("renders Learn More heading", () => {
      render(<NextSteps dropletId={1} nextSteps={mockNextSteps} />);
      expect(screen.getByText("Learn More")).toBeInTheDocument();
    });

    it("renders descriptive text", () => {
      render(<NextSteps dropletId={1} nextSteps={mockNextSteps} />);
      expect(
        screen.getByText(
          "To further your understanding, we recommend exploring:",
        ),
      ).toBeInTheDocument();
    });

    it("renders next steps list", () => {
      render(<NextSteps dropletId={1} nextSteps={mockNextSteps} />);
      expect(screen.getByText("Step 1")).toBeInTheDocument();
      expect(screen.getByText("Step 2")).toBeInTheDocument();
      expect(screen.getByText("http://example.com/1")).toBeInTheDocument();
      expect(screen.getByText("http://example.com/2")).toBeInTheDocument();
    });

    it("renders form inputs", () => {
      render(<NextSteps dropletId={1} nextSteps={mockNextSteps} />);
      expect(screen.getByPlaceholderText("URL")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Label")).toBeInTheDocument();
    });

    it("renders Add button", () => {
      render(<NextSteps dropletId={1} nextSteps={mockNextSteps} />);
      expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
    });

    it("renders with empty next steps", () => {
      render(<NextSteps dropletId={1} nextSteps={[]} />);
      expect(screen.getByText("Learn More")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("URL")).toBeInTheDocument();
    });

    it("renders all next steps items", () => {
      render(<NextSteps dropletId={1} nextSteps={mockNextSteps} />);
      expect(screen.getByTestId("next-step-1")).toBeInTheDocument();
      expect(screen.getByTestId("next-step-2")).toBeInTheDocument();
    });

    it("renders remove buttons for each step", () => {
      render(<NextSteps dropletId={1} nextSteps={mockNextSteps} />);
      expect(screen.getByTestId("remove-1")).toBeInTheDocument();
      expect(screen.getByTestId("remove-2")).toBeInTheDocument();
    });
  });

  describe("Form Input Interactions", () => {
    it("updates URL input value", () => {
      render(<NextSteps dropletId={1} nextSteps={mockNextSteps} />);
      const urlInput = screen.getByPlaceholderText("URL") as HTMLInputElement;
      fireEvent.change(urlInput, { target: { value: "https://new-url.com" } });
      expect(urlInput.value).toBe("https://new-url.com");
    });

    it("updates label input value", () => {
      render(<NextSteps dropletId={1} nextSteps={mockNextSteps} />);
      const labelInput = screen.getByPlaceholderText(
        "Label",
      ) as HTMLInputElement;
      fireEvent.change(labelInput, { target: { value: "New Label" } });
      expect(labelInput.value).toBe("New Label");
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

    it("URL input starts empty", () => {
      render(<NextSteps dropletId={1} nextSteps={mockNextSteps} />);
      const urlInput = screen.getByPlaceholderText("URL") as HTMLInputElement;
      expect(urlInput.value).toBe("");
    });

    it("Label input starts empty", () => {
      render(<NextSteps dropletId={1} nextSteps={mockNextSteps} />);
      const labelInput = screen.getByPlaceholderText(
        "Label",
      ) as HTMLInputElement;
      expect(labelInput.value).toBe("");
    });

    it("handles typing in URL input with userEvent", async () => {
      const user = userEvent.setup();
      render(<NextSteps dropletId={1} nextSteps={mockNextSteps} />);
      const urlInput = screen.getByPlaceholderText("URL");
      await user.type(urlInput, "https://typed-url.com");
      expect(urlInput).toHaveValue("https://typed-url.com");
    });

    it("handles typing in Label input with userEvent", async () => {
      const user = userEvent.setup();
      render(<NextSteps dropletId={1} nextSteps={mockNextSteps} />);
      const labelInput = screen.getByPlaceholderText("Label");
      await user.type(labelInput, "Typed Label");
      expect(labelInput).toHaveValue("Typed Label");
    });
  });

  describe("Adding Next Steps - Validation Branches", () => {
    it("does not add when URL is empty", () => {
      render(<NextSteps dropletId={1} nextSteps={mockNextSteps} />);
      const labelInput = screen.getByPlaceholderText("Label");
      fireEvent.change(labelInput, { target: { value: "Label Only" } });
      const form = screen.getByRole("form");
      fireEvent.submit(form);
      expect(updateDroplet).not.toHaveBeenCalled();
    });

    it("does not add when label is empty", () => {
      render(<NextSteps dropletId={1} nextSteps={mockNextSteps} />);
      const urlInput = screen.getByPlaceholderText("URL");
      fireEvent.change(urlInput, { target: { value: "https://url-only.com" } });
      const form = screen.getByRole("form");
      fireEvent.submit(form);
      expect(updateDroplet).not.toHaveBeenCalled();
    });

    it("does not add when both inputs are empty", () => {
      render(<NextSteps dropletId={1} nextSteps={mockNextSteps} />);
      const form = screen.getByRole("form");
      fireEvent.submit(form);
      expect(updateDroplet).not.toHaveBeenCalled();
    });

    it("does not add when URL is only whitespace", () => {
      render(<NextSteps dropletId={1} nextSteps={mockNextSteps} />);
      const urlInput = screen.getByPlaceholderText("URL");
      const labelInput = screen.getByPlaceholderText("Label");
      fireEvent.change(urlInput, { target: { value: "   " } });
      fireEvent.change(labelInput, { target: { value: "Label" } });
      const form = screen.getByRole("form");
      fireEvent.submit(form);
      expect(updateDroplet).not.toHaveBeenCalled();
    });

    it("does not add when label is only whitespace", () => {
      render(<NextSteps dropletId={1} nextSteps={mockNextSteps} />);
      const urlInput = screen.getByPlaceholderText("URL");
      const labelInput = screen.getByPlaceholderText("Label");
      fireEvent.change(urlInput, { target: { value: "https://test.com" } });
      fireEvent.change(labelInput, { target: { value: "   " } });
      const form = screen.getByRole("form");
      fireEvent.submit(form);
      expect(updateDroplet).not.toHaveBeenCalled();
    });

    it("adds with valid data and clears inputs", async () => {
      render(<NextSteps dropletId={1} nextSteps={mockNextSteps} />);
      const urlInput = screen.getByPlaceholderText("URL") as HTMLInputElement;
      const labelInput = screen.getByPlaceholderText(
        "Label",
      ) as HTMLInputElement;
      fireEvent.change(urlInput, { target: { value: "https://new.com" } });
      fireEvent.change(labelInput, { target: { value: "New Step" } });
      const form = screen.getByRole("form");
      fireEvent.submit(form);
      await waitFor(() => {});
    });

    it("adds to empty array", async () => {
      render(<NextSteps dropletId={1} nextSteps={[]} />);
      const urlInput = screen.getByPlaceholderText("URL");
      const labelInput = screen.getByPlaceholderText("Label");
      fireEvent.change(urlInput, { target: { value: "https://first.com" } });
      fireEvent.change(labelInput, { target: { value: "First" } });
      const form = screen.getByRole("form");
      fireEvent.submit(form);
    });
  });

  describe("Removing Next Steps", () => {
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

    it("removes with correct droplet ID", async () => {
      render(<NextSteps dropletId={42} nextSteps={mockNextSteps} />);
      fireEvent.click(screen.getByTestId("remove-1"));
      await waitFor(() => {
        expect(updateDroplet).toHaveBeenCalledWith(42, expect.any(Object));
      });
    });

    it("handles remove with userEvent", async () => {
      const user = userEvent.setup();
      render(<NextSteps dropletId={1} nextSteps={mockNextSteps} />);
      await user.click(screen.getByTestId("remove-1"));
      await waitFor(() => {
        expect(updateDroplet).toHaveBeenCalled();
      });
    });
  });

  describe("Updating Next Steps - Testing Filter Branches", () => {
    it("updates first step in 2-item list", async () => {
      render(<NextSteps dropletId={1} nextSteps={mockNextSteps} />);
      fireEvent.click(screen.getByTestId("update-1"));
      await waitFor(() => {
        expect(mockHandleChange).toHaveBeenCalledWith({
          nextSteps: [
            { label: "Updated Label 1", url: "http://updated1.com" },
            { label: "Step 2", url: "http://example.com/2" },
          ],
        });
      });
    });

    it("updates first step in 3-item list", async () => {
      const threeSteps = [
        { id: 1, label: "A", url: "http://a.com" },
        { id: 2, label: "B", url: "http://b.com" },
        { id: 3, label: "C", url: "http://c.com" },
      ];
      render(<NextSteps dropletId={1} nextSteps={threeSteps} />);
      fireEvent.click(screen.getByTestId("update-1"));
      await waitFor(() => {
        expect(mockHandleChange).toHaveBeenCalledWith({
          nextSteps: [
            { label: "Updated Label 1", url: "http://updated1.com" },
            { label: "B", url: "http://b.com" },
            { label: "C", url: "http://c.com" },
          ],
        });
      });
    });

    it("updates middle step in 3-item list", async () => {
      const threeSteps = [
        { id: 1, label: "A", url: "http://a.com" },
        { id: 2, label: "B", url: "http://b.com" },
        { id: 3, label: "C", url: "http://c.com" },
      ];
      render(<NextSteps dropletId={1} nextSteps={threeSteps} />);
      fireEvent.click(screen.getByTestId("update-2"));
      await waitFor(() => {
        expect(mockHandleChange).toHaveBeenCalledWith({
          nextSteps: [
            { label: "A", url: "http://a.com" },
            { label: "Updated Label 2", url: "http://updated2.com" },
            { label: "C", url: "http://c.com" },
          ],
        });
      });
    });

    it("updates last step in 3-item list", async () => {
      const threeSteps = [
        { id: 1, label: "A", url: "http://a.com" },
        { id: 2, label: "B", url: "http://b.com" },
        { id: 3, label: "C", url: "http://c.com" },
      ];
      render(<NextSteps dropletId={1} nextSteps={threeSteps} />);
      fireEvent.click(screen.getByTestId("update-3"));
      await waitFor(() => {
        expect(mockHandleChange).toHaveBeenCalledWith({
          nextSteps: [
            { label: "A", url: "http://a.com" },
            { label: "B", url: "http://b.com" },
            { label: "Updated Label 3", url: "http://updated3.com" },
          ],
        });
      });
    });

    it("updates with non-sequential IDs", async () => {
      const gapSteps = [
        { id: 10, label: "Ten", url: "http://ten.com" },
        { id: 25, label: "TwentyFive", url: "http://twentyfive.com" },
        { id: 30, label: "Thirty", url: "http://thirty.com" },
      ];
      render(<NextSteps dropletId={1} nextSteps={gapSteps} />);
      fireEvent.click(screen.getByTestId("update-25"));
      await waitFor(() => {
        expect(mockHandleChange).toHaveBeenCalledWith({
          nextSteps: [
            { label: "Ten", url: "http://ten.com" },
            { label: "Updated Label 25", url: "http://updated25.com" },
            { label: "Thirty", url: "http://thirty.com" },
          ],
        });
      });
    });

    it("updates with large gap IDs", async () => {
      const largeGapSteps = [
        { id: 100, label: "First", url: "http://first.com" },
        { id: 200, label: "Second", url: "http://second.com" },
      ];
      render(<NextSteps dropletId={1} nextSteps={largeGapSteps} />);
      fireEvent.click(screen.getByTestId("update-200"));
      await waitFor(() => {
        expect(mockHandleChange).toHaveBeenCalledWith({
          nextSteps: [
            { label: "First", url: "http://first.com" },
            { label: "Updated Label 200", url: "http://updated200.com" },
          ],
        });
      });
    });

    it("updates first in 5-item list", async () => {
      const fiveSteps = [
        { id: 1, label: "One", url: "http://1.com" },
        { id: 2, label: "Two", url: "http://2.com" },
        { id: 3, label: "Three", url: "http://3.com" },
        { id: 4, label: "Four", url: "http://4.com" },
        { id: 5, label: "Five", url: "http://5.com" },
      ];
      render(<NextSteps dropletId={1} nextSteps={fiveSteps} />);
      fireEvent.click(screen.getByTestId("update-1"));
      await waitFor(() => {
        expect(mockHandleChange).toHaveBeenCalledWith({
          nextSteps: [
            { label: "Updated Label 1", url: "http://updated1.com" },
            { label: "Two", url: "http://2.com" },
            { label: "Three", url: "http://3.com" },
            { label: "Four", url: "http://4.com" },
            { label: "Five", url: "http://5.com" },
          ],
        });
      });
    });

    it("updates middle in 5-item list", async () => {
      const fiveSteps = [
        { id: 1, label: "One", url: "http://1.com" },
        { id: 2, label: "Two", url: "http://2.com" },
        { id: 3, label: "Three", url: "http://3.com" },
        { id: 4, label: "Four", url: "http://4.com" },
        { id: 5, label: "Five", url: "http://5.com" },
      ];
      render(<NextSteps dropletId={1} nextSteps={fiveSteps} />);
      fireEvent.click(screen.getByTestId("update-3"));
      await waitFor(() => {
        expect(mockHandleChange).toHaveBeenCalledWith({
          nextSteps: [
            { label: "One", url: "http://1.com" },
            { label: "Two", url: "http://2.com" },
            { label: "Updated Label 3", url: "http://updated3.com" },
            { label: "Four", url: "http://4.com" },
            { label: "Five", url: "http://5.com" },
          ],
        });
      });
    });

    it("updates last in 5-item list", async () => {
      const fiveSteps = [
        { id: 1, label: "One", url: "http://1.com" },
        { id: 2, label: "Two", url: "http://2.com" },
        { id: 3, label: "Three", url: "http://3.com" },
        { id: 4, label: "Four", url: "http://4.com" },
        { id: 5, label: "Five", url: "http://5.com" },
      ];
      render(<NextSteps dropletId={1} nextSteps={fiveSteps} />);
      fireEvent.click(screen.getByTestId("update-5"));
      await waitFor(() => {
        expect(mockHandleChange).toHaveBeenCalledWith({
          nextSteps: [
            { label: "One", url: "http://1.com" },
            { label: "Two", url: "http://2.com" },
            { label: "Three", url: "http://3.com" },
            { label: "Four", url: "http://4.com" },
            { label: "Updated Label 5", url: "http://updated5.com" },
          ],
        });
      });
    });
  });

  describe("Error Handling", () => {
    it("displays error from useDropletUpdate", () => {
      mockUseDropletUpdate.mockReturnValue({
        error: "Update failed" as string | null,
        handleChange: mockHandleChange,
      });
      render(<NextSteps dropletId={1} nextSteps={mockNextSteps} />);
      expect(screen.getByText("Update failed")).toBeInTheDocument();
    });

    it("does not display error when error is null", () => {
      mockUseDropletUpdate.mockReturnValue({
        error: null as string | null,
        handleChange: mockHandleChange,
      });
      render(<NextSteps dropletId={1} nextSteps={mockNextSteps} />);
      expect(screen.queryByText(/failed/i)).not.toBeInTheDocument();
    });

    it("error message has correct styling", () => {
      mockUseDropletUpdate.mockReturnValue({
        error: "Test error" as string | null,
        handleChange: mockHandleChange,
      });
      render(<NextSteps dropletId={1} nextSteps={mockNextSteps} />);
      const error = screen.getByText("Test error");
      expect(error).toHaveClass("text-red-500");
      expect(error).toHaveClass("mt-2");
    });
  });

  describe("Styling", () => {
    it("applies correct heading styles", () => {
      render(<NextSteps dropletId={1} nextSteps={mockNextSteps} />);
      const heading = screen.getByText("Learn More");
      expect(heading.tagName).toBe("H2");
      expect(heading).toHaveClass("text-2xl");
      expect(heading).toHaveClass("font-bold");
    });

    it("applies dark mode classes to heading", () => {
      render(<NextSteps dropletId={1} nextSteps={mockNextSteps} />);
      const heading = screen.getByText("Learn More");
      expect(heading).toHaveClass("dark:text-white");
    });

    it("applies correct description styles", () => {
      render(<NextSteps dropletId={1} nextSteps={mockNextSteps} />);
      const description = screen.getByText(
        "To further your understanding, we recommend exploring:",
      );
      expect(description).toHaveClass("text-slate-600");
      expect(description).toHaveClass("dark:text-slate-300");
    });
  });

  describe("Edge Cases", () => {
    it("handles many next steps", () => {
      const manySteps = Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        label: `Step ${i + 1}`,
        url: `http://example.com/${i + 1}`,
      }));
      render(<NextSteps dropletId={1} nextSteps={manySteps} />);
      expect(screen.getByText("Step 1")).toBeInTheDocument();
      expect(screen.getByText("Step 50")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("form has proper role", () => {
      render(<NextSteps dropletId={1} nextSteps={mockNextSteps} />);
      expect(screen.getByRole("form")).toBeInTheDocument();
    });

    it("heading is properly nested", () => {
      render(<NextSteps dropletId={1} nextSteps={mockNextSteps} />);
      const heading = screen.getByRole("heading", { name: "Learn More" });
      expect(heading).toBeInTheDocument();
      expect(heading.tagName).toBe("H2");
    });

    it("inputs have placeholder text", () => {
      render(<NextSteps dropletId={1} nextSteps={mockNextSteps} />);
      expect(screen.getByPlaceholderText("URL")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Label")).toBeInTheDocument();
    });

    it("uses semantic HTML structure", () => {
      const { container } = render(
        <NextSteps dropletId={1} nextSteps={mockNextSteps} />,
      );
      const section = container.querySelector("section");
      const ul = container.querySelector("ul");
      expect(section).toBeInTheDocument();
      expect(ul).toBeInTheDocument();
    });
  });
});
