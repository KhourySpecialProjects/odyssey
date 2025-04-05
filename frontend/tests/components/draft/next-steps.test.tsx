import { render, screen, fireEvent, renderHook, waitFor } from "@testing-library/react";
import { NextSteps } from "@/components/draft/metadata/next-steps/next-steps";
import { updateDroplet } from "@/lib/actions";
import { act, useState } from "react";
import { toast } from "sonner";
import userEvent from "@testing-library/user-event";

jest.mock("@/lib/actions", () => ({
  updateDroplet: jest.fn(() => Promise.resolve({ data: true, error: null })),
}));

jest.mock("sonner", () => ({
  toast: {
    error: jest.fn(),
  },
}));

jest.mock("@/components/draft/metadata/hooks/useDropletUpdate", () => ({
  useDropletUpdate: () => ({
    error: null,
    handleChange: jest.fn(),
  }),
}));

describe("NextSteps", () => {
  const mockNextSteps = [
    { id: 1, label: "Step 1", url: "http://example.com/1" },
    { id: 2, label: "Step 2", url: "http://example.com/2" },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders next steps list", () => {
    render(<NextSteps dropletId={1} nextSteps={mockNextSteps} />);
    expect(screen.getByText("Step 1")).toBeInTheDocument();
    expect(screen.getByText("Step 2")).toBeInTheDocument();
  });

  it("prevents submission with empty fields", async () => {
    render(<NextSteps dropletId={1} nextSteps={mockNextSteps} />);

    const form = screen.getByRole("form");
    await fireEvent.submit(form);

    expect(updateDroplet).not.toHaveBeenCalled();
  });

  it("initializes with next steps", () => {
    render(<NextSteps dropletId={1} nextSteps={mockNextSteps} />);

    expect(screen.getByText("Step 1")).toBeInTheDocument();
    expect(screen.getByText("Step 2")).toBeInTheDocument();
  });

  it("initializes with next steps", () => {
    render(<NextSteps dropletId={1} nextSteps={mockNextSteps} />);

    expect(screen.getByText("Step 1")).toBeInTheDocument();
    expect(screen.getByText("Step 2")).toBeInTheDocument();
  });

jest.mock('@/lib/actions', () => ({
  updateDroplet: jest.fn()
}));

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn()
  }
}));

describe('NextSteps', () => {
  const mockNextSteps = [
    { id: 1, label: 'Test 1', url: 'https://test1.com' },
    { id: 2, label: 'Test 2', url: 'https://test2.com' }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('updateNextStep updates the correct next step', () => {
    const { result } = renderHook(() => {
      const [nextSteps, setNextSteps] = useState(mockNextSteps);
      return { nextSteps, setNextSteps };
    });

    const updatedStep = {
      id: 1,
      label: 'Updated Label',
      url: 'https://updated.com'
    };

    act(() => {
      result.current.setNextSteps(prevSteps => {
        const newNextSteps = [...prevSteps];
        newNextSteps.filter(ns => ns.id === 1)[0].label = updatedStep.label;
        newNextSteps.filter(ns => ns.id === 1)[0].url = updatedStep.url;
        return newNextSteps;
      });
    });

    expect(result.current.nextSteps[0].label).toBe('Updated Label');
    expect(result.current.nextSteps[0].url).toBe('https://updated.com');
  });

  test('renders form inputs correctly', () => {
    render(<NextSteps dropletId={1} nextSteps={mockNextSteps} />);

    const urlInput = screen.getByPlaceholderText('URL');
    const labelInput = screen.getByPlaceholderText('Label');
    const addButton = screen.getByRole('button');

    expect(urlInput).toBeInTheDocument();
    expect(labelInput).toBeInTheDocument();
    expect(addButton).toBeInTheDocument();
  });
});
});
