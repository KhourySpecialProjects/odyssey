import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import TimeZoneSelector from "@/components/settings/time-zone-selector";
import { setTimeZone } from "@/lib/actions";
import { TIME_ZONES } from "@/lib/time-zones";

jest.mock("@/lib/actions", () => ({
  setTimeZone: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

const mockedSetTimeZone = setTimeZone as jest.Mock;

describe("TimeZoneSelector", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedSetTimeZone.mockResolvedValue({ success: true });
  });

  it("renders with current timezone", () => {
    render(<TimeZoneSelector currentZone="America/New_York" userId={1} />);
    expect(screen.getByDisplayValue("America/New_York")).toBeInTheDocument();
  });

  it("offers every listed zone, with values the enum accepts", () => {
    render(<TimeZoneSelector currentZone="America/New_York" userId={1} />);
    const values = screen
      .getAllByRole("option")
      .map((option) => (option as HTMLOptionElement).value)
      .filter(Boolean);
    expect(values).toEqual([...TIME_ZONES]);
  });

  it("calls setTimeZone when changed", async () => {
    render(<TimeZoneSelector currentZone="America/New_York" userId={1} />);

    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "Europe/London" },
    });

    // setTimeZone resolves userId from the authenticated session — see
    // docs/agent/learnings/strapi-service-token-trust-boundary.md.
    expect(setTimeZone).toHaveBeenCalledWith("Europe/London");
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(
        "Time zone updated successfully!",
      ),
    );
    expect(screen.getByDisplayValue("Europe/London")).toBeInTheDocument();
  });

  it("shows an error and keeps the saved zone when the save fails", async () => {
    mockedSetTimeZone.mockResolvedValue({ success: false, error: "boom" });
    render(<TimeZoneSelector currentZone="America/New_York" userId={1} />);

    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "America/Los_Angeles" },
    });

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Could not update your time zone. Please try again.",
      ),
    );
    expect(toast.success).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue("America/New_York")).toBeInTheDocument();
  });
});
