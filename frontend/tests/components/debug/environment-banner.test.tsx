import { render, screen } from "@testing-library/react";
import { EnvironmentBanner } from "@/components/debug/environmentBanner";
import { getCurrentUser } from "@/lib/auth/session";

jest.mock("@/lib/auth/session", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("next/headers", () => ({
  cookies: jest.fn().mockResolvedValue({
    get: jest.fn().mockReturnValue(undefined),
  }),
}));

jest.mock("@/components/debug/role-switcher", () => ({
  RoleSwitcher: ({ currentRoles }: { currentRoles: string[] }) => (
    <div data-testid="role-switcher">{currentRoles.join(", ")}</div>
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
      roles: ["User"],
    });
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("renders with correct environment name for development", async () => {
    process.env.NEXT_PUBLIC_APP_ENV = "development";

    render(await EnvironmentBanner({}));

    expect(screen.getByText("< development ENVIRONMENT >")).toBeInTheDocument();
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

  it("renders role switcher when user is logged in (dev mode)", async () => {
    process.env.NEXT_PUBLIC_APP_ENV = "development";
    process.env.NODE_ENV = "development";

    render(await EnvironmentBanner({}));

    expect(screen.getByTestId("role-switcher")).toBeInTheDocument();
    expect(screen.getByText("User")).toBeInTheDocument();
  });

  it("hides role switcher outside dev mode", async () => {
    process.env.NEXT_PUBLIC_APP_ENV = "staging";
    process.env.NODE_ENV = "production";

    render(await EnvironmentBanner({}));

    expect(screen.queryByTestId("role-switcher")).not.toBeInTheDocument();
  });
});
