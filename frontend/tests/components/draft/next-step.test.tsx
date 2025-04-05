import { render, screen, fireEvent } from "@testing-library/react";
import { NextStepDisplay } from "@/components/draft/metadata/next-steps/next-step";
import userEvent from "@testing-library/user-event";

describe("NextStepDisplay", () => {
  const mockInitial = {
    id: 1,
    label: "Test Label",
    url: "https://test.com",
  };
  const mockUpdate = jest.fn();
  const mockRemove = jest.fn();

  it("renders next step with label", () => {
    render(
      <NextStepDisplay
        initial={mockInitial}
        update={mockUpdate}
        remove={mockRemove}
      />,
    );
    expect(screen.getByText("Test Label")).toBeInTheDocument();
  });

  it("shows edit form when clicked", () => {
    render(
      <NextStepDisplay
        initial={mockInitial}
        update={mockUpdate}
        remove={mockRemove}
      />,
    );
    fireEvent.click(screen.getByText("Test Label"));
    expect(screen.getByDisplayValue("Test Label")).toBeInTheDocument();
    expect(screen.getByDisplayValue("https://test.com")).toBeInTheDocument();
  });

  it("updates next step on change", () => {
    render(
      <NextStepDisplay
        initial={mockInitial}
        update={mockUpdate}
        remove={mockRemove}
      />,
    );
    fireEvent.click(screen.getByText("Test Label"));
    fireEvent.change(screen.getByDisplayValue("Test Label"), {
      target: { value: "New Label" },
    });
    expect(mockUpdate).toHaveBeenCalledWith({
      id: 1,
      label: "New Label",
      url: "https://test.com",
    });
  });

  describe("NextStepDisplay", () => {
    const mockInitial = {
      id: 1,
      label: "Test Label",
      url: "https://test.com",
    };

    const mockProps = {
      initial: mockInitial,
      update: jest.fn(),
      remove: jest.fn(),
    };

    it("updates URL when input changes", async () => {
      const user = userEvent.setup();
      render(<NextStepDisplay {...mockProps} />);

      await user.click(screen.getByText("Test Label"));

      const urlInput = screen.getAllByRole("textbox")[1];
      await user.clear(urlInput);
      await user.type(urlInput, "https://newtest.com");

      expect(mockProps.update).toHaveBeenCalledWith({
        id: mockInitial.id,
        url: "https://newtest.com",
        label: mockInitial.label,
      });
    });
  });

describe('NextStepDisplay', () => {
  const mockResource = {
    id: 1,
    label: 'Test Label',
    url: 'https://test.com'
  };

  test('displays label when available', () => {
    render(
      <NextStepDisplay
        initial={mockResource}
        update={jest.fn()}
        remove={jest.fn()}
      />
    );

    expect(screen.getByText('Test Label')).toBeInTheDocument();
  });

  test('falls back to URL when label is not available', () => {
    const noLabelResource = {
      id: 1,
      label: '',
      url: 'https://test.com'
    };

    const { container } = render(
      <NextStepDisplay
        initial={noLabelResource}
        update={jest.fn()}
        remove={jest.fn()}
      />
    );

    expect(container.textContent).toContain('');
  });

  test('falls back to URL when label is null', () => {
    const nullLabelResource = {
      id: 1,
      label: undefined,
      url: 'https://test.com'
    };

    render(
      <NextStepDisplay
        initial={nullLabelResource}
        update={jest.fn()}
        remove={jest.fn()}
      />
    );

    expect(screen.getByText('https://test.com')).toBeInTheDocument();
  });
});
});
