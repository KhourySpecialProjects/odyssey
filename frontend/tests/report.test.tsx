import { render, screen } from "@testing-library/react";
import { ReportBlock } from "@/components/admin/reports/report";

// Mock Next.js Link component
jest.mock("next/link", () => {
  return function Link({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) {
    return <a href={href}>{children}</a>;
  };
});

describe("ReportBlock", () => {
  const mockReport = {
    id: "1",
    type: "Bug",
    fullName: "John Doe",
    email: "john.doe@example.com",
    path: "/some-path",
    description: "This is a test report description",
  };

  it("renders report information correctly", () => {
    render(<ReportBlock report={mockReport} />);

    expect(screen.getByText(/John Doe/)).toBeInTheDocument();
    expect(screen.getByText(/john.doe@example.com/)).toBeInTheDocument();
    expect(screen.getByText(/Bug/)).toBeInTheDocument();
    expect(
      screen.getByText("This is a test report description"),
    ).toBeInTheDocument();
  });

  it("links to the correct report path", () => {
    render(<ReportBlock report={mockReport} />);

    const link = screen.getByRole("link", { name: /Visit Reported Page/i });
    expect(link).toHaveAttribute("href", "/some-path");
  });
});
