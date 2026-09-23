import { fireEvent, render, screen } from "@testing-library/react";
import DateTimePicker from "@/components/group/datetime-picker";
import { DateTime, Settings } from "luxon";

describe("DateTimePicker", () => {
  const mockOnChange = jest.fn();

  it("renders a labelled datetime-local input", () => {
    render(<DateTimePicker date={null} onChange={mockOnChange} />);

    const picker = screen.getByTestId("picker");
    expect(picker).toHaveAttribute("type", "datetime-local");
    expect(screen.getByLabelText("Due date")).toBe(picker);
  });

  it("accepts a custom accessible label", () => {
    render(
      <DateTimePicker
        date={null}
        onChange={mockOnChange}
        aria-label="Assignment deadline"
      />,
    );

    expect(screen.getByLabelText("Assignment deadline")).toBeInTheDocument();
  });

  it("displays the selected date in the date's own zone", () => {
    const date = DateTime.fromISO("2024-03-20T15:00:00.000Z", {
      zone: "America/New_York",
    });

    render(<DateTimePicker date={date} onChange={mockOnChange} />);

    expect(screen.getByTestId("picker")).toHaveValue("2024-03-20T11:00");
  });

  it("is empty when date is null", () => {
    render(<DateTimePicker date={null} onChange={mockOnChange} />);

    expect(screen.getByTestId("picker")).toHaveValue("");
  });

  it("emits a DateTime in the incoming date's zone", () => {
    const date = DateTime.fromISO("2024-03-20T15:00:00.000Z", {
      zone: "America/New_York",
    });
    render(<DateTimePicker date={date} onChange={mockOnChange} />);

    fireEvent.change(screen.getByTestId("picker"), {
      target: { value: "2024-03-21T08:30" },
    });

    expect(mockOnChange).toHaveBeenCalledTimes(1);
    const emitted: DateTime = mockOnChange.mock.calls[0][0];
    expect(emitted.zoneName).toBe("America/New_York");
    expect(emitted.toISO()).toBe("2024-03-21T08:30:00.000-04:00");
  });

  it("falls back to luxon's default zone when date is null", () => {
    const originalZone = Settings.defaultZone;
    Settings.defaultZone = "Asia/Tokyo";
    try {
      render(<DateTimePicker date={null} onChange={mockOnChange} />);

      fireEvent.change(screen.getByTestId("picker"), {
        target: { value: "2024-03-21T08:30" },
      });

      const emitted: DateTime = mockOnChange.mock.calls[0][0];
      expect(emitted.zoneName).toBe("Asia/Tokyo");
      expect(emitted.toISO()).toBe("2024-03-21T08:30:00.000+09:00");
    } finally {
      Settings.defaultZone = originalZone;
    }
  });

  it("emits null when the input is cleared", () => {
    const date = DateTime.fromISO("2024-03-20T15:00:00.000Z");
    render(<DateTimePicker date={date} onChange={mockOnChange} />);

    fireEvent.change(screen.getByTestId("picker"), { target: { value: "" } });

    expect(mockOnChange).toHaveBeenCalledWith(null);
    expect(screen.getByTestId("picker")).toHaveValue("");
  });

  it("updates the displayed value when the date prop changes", () => {
    const { rerender } = render(
      <DateTimePicker date={null} onChange={mockOnChange} />,
    );
    expect(screen.getByTestId("picker")).toHaveValue("");

    rerender(
      <DateTimePicker
        date={DateTime.fromISO("2025-03-20T09:19:00.000Z")}
        onChange={mockOnChange}
      />,
    );

    // Tests run with TZ=UTC
    expect(screen.getByTestId("picker")).toHaveValue("2025-03-20T09:19");
  });
});
