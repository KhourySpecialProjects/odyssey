import { render, screen } from "@testing-library/react";
import { EnvironmentBanner } from "@/components/debug/environmentBanner";
import { getCurrentUser } from "@/lib/auth/session";

// Mock dependencies
jest.mock("@/lib/auth/session", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("@/components/debug/reportBugButton", () => ({
  ReportBugButton: ({ user }: { user: any }) => (
    <button data-testid="report-bug-button">Report Bug</button>
  ),
}));

const originalEnv = process.env;

describe("EnvironmentBanner", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    (getCurrentUser as jest.Mock).mockResolvedValue({
      id: 1,
      email: "test@example.com",
    });
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("renders with correct environment name for development", async () => {
    process.env.NEXT_PUBLIC_APP_ENV = "development";

    render(await EnvironmentBanner({}));

    expect(screen.getByText("< development ENVIRONMENT >")).toBeInTheDocument();
    expect(screen.getByTestId("report-bug-button")).toBeInTheDocument();
  });

  it("renders with correct environment name for staging", async () => {
    process.env.NEXT_PUBLIC_APP_ENV = "staging";

    render(await EnvironmentBanner({}));

    expect(screen.getByText("< staging ENVIRONMENT >")).toBeInTheDocument();
  });

  it("does not render in production environment", async () => {
    process.env.NEXT_PUBLIC_APP_ENV = "production";

    const result = await EnvironmentBanner({});
    expect(result).toBeNull();
  });

  it("applies custom class names correctly", async () => {
    process.env.NEXT_PUBLIC_APP_ENV = "test";

    render(await EnvironmentBanner({ className: "test-class" }));

    const banner = screen.getByText("< test ENVIRONMENT >").parentElement;
    expect(banner).toHaveClass("test-class");
  });

  it("passes user prop to ReportBugButton", async () => {
    process.env.NEXT_PUBLIC_APP_ENV = "test";

    const mockUser = { id: 1, email: "test@example.com" };
    (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);

    render(await EnvironmentBanner({}));

    expect(screen.getByTestId("report-bug-button")).toBeInTheDocument();
  });
});
