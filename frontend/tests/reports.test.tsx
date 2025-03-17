import { render, screen } from "@testing-library/react";
import { Reports } from "@/components/admin/reports/reports";
import { fetchReports } from "@/lib/requests/data";

// Mock dependencies
jest.mock("@/lib/requests/data", () => ({
  fetchReports: jest.fn(),
}));

jest.mock("@/components/admin/reports/report", () => ({
  ReportBlock: ({ report }: { report: any }) => (
    <div data-testid={`report-${report.id}`}>
      {report.fullName} - {report.description}
    </div>
  ),
}));

describe("Reports", () => {
  const mockReports = [
    {
      id: "1",
      type: "Bug",
      fullName: "John Doe",
      email: "john.doe@example.com",
      path: "/some-path",
      description: "This is a test report description",
    },
    {
      id: "2",
      type: "Content",
      fullName: "Jane Smith",
      email: "jane.smith@example.com",
      path: "/another-path",
      description: "Another test report",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (fetchReports as jest.Mock).mockResolvedValue(mockReports);
  });

  it("renders the component with correct heading", async () => {
    render(await Reports());

    expect(screen.getByText("Reports")).toBeInTheDocument();
    expect(
      screen.getByText("The following reports have been received from users."),
    ).toBeInTheDocument();
  });

  it("displays reports when available", async () => {
    render(await Reports());

    expect(screen.getByTestId("report-1")).toBeInTheDocument();
    expect(screen.getByTestId("report-2")).toBeInTheDocument();
  });

  it("displays a message when no reports are available", async () => {
    (fetchReports as jest.Mock).mockResolvedValue([]);

    render(await Reports());

    expect(
      screen.getByText("There are no reports at this time."),
    ).toBeInTheDocument();
  });

  it("calls fetchReports to get data", async () => {
    render(await Reports());

    expect(fetchReports).toHaveBeenCalledTimes(1);
  });
});
