import { render, screen } from "@testing-library/react";
import MUIDateTimePicker from "@/components/group/datetime-picker";
import { DateTime } from "luxon";

describe("MUIDateTimePicker", () => {
  const mockOnChange = jest.fn();
  const mockDate = DateTime.fromJSDate(new Date("2025-03-20T09:19:00"));

  it("renders date time picker", () => {
    render(<MUIDateTimePicker date={mockDate} onChange={mockOnChange} />);
    expect(screen.getByTestId("picker")).toBeInTheDocument();
  });

  it("displays selected date", () => {
    const mockOnChange = jest.fn();

    render(<MUIDateTimePicker date={mockDate} onChange={mockOnChange} />);

    const input = screen.getByRole("textbox");
    expect(input).toHaveValue("03/20/2025 09:19 AM");
  });

  jest.mock("@mui/x-date-pickers/LocalizationProvider", () => ({
    LocalizationProvider: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
  }));

  jest.mock("@mui/x-date-pickers/DateTimePicker", () => ({
    DateTimePicker: ({ value, onChange, label }: any) => (
      <input
        type="datetime-local"
        value={value?.toISO() || ""}
        onChange={(e) => onChange(DateTime.fromISO(e.target.value))}
        aria-label={label}
      />
    ),
  }));

  describe("MUIDateTimePicker", () => {
    test("passes date value and onChange handler correctly", () => {
      const mockDate = DateTime.fromISO("2024-03-20T15:00:00.000Z");
      const mockOnChange = jest.fn();

      render(<MUIDateTimePicker date={mockDate} onChange={mockOnChange} />);

      const picker = screen.getByTestId("picker");
      expect(picker).toHaveValue("03/20/2024 11:00 AM");
    });
  });
});
