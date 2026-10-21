import { render, waitFor } from "@testing-library/react";

const mockUseSession = jest.fn();
const mockGetAuthorizedUserByEmail = jest.fn();
const mockPh = { identify: jest.fn(), reset: jest.fn() };

jest.mock("next-auth/react", () => ({
  useSession: () => mockUseSession(),
}));

jest.mock("@/lib/requests/authorized-user", () => ({
  getAuthorizedUserByEmail: (...args: unknown[]) =>
    mockGetAuthorizedUserByEmail(...args),
}));

jest.mock("posthog-js", () => ({
  __esModule: true,
  default: { init: jest.fn() },
}));

jest.mock("posthog-js/react", () => ({
  PostHogProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  usePostHog: () => mockPh,
}));

describe("PHProvider identify", () => {
  const originalAppEnv = process.env.NEXT_PUBLIC_APP_ENV;
  let PHProvider: typeof import("@/providers/PHProvider").PHProvider;

  beforeAll(() => {
    // isLocal is read at module load, so load the provider in a non-local env
    process.env.NEXT_PUBLIC_APP_ENV = "production";
    PHProvider = require("@/providers/PHProvider").PHProvider;
  });

  afterAll(() => {
    process.env.NEXT_PUBLIC_APP_ENV = originalAppEnv;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const sessionUser = {
    name: "Test User",
    email: "test@example.com",
    username: "tuser",
  };

  it("identifies from the session id and never calls the lookup action", async () => {
    mockUseSession.mockReturnValue({
      status: "authenticated",
      data: { user: { ...sessionUser, id: 42 } },
    });

    render(
      <PHProvider>
        <div />
      </PHProvider>,
    );

    await waitFor(() => expect(mockPh.identify).toHaveBeenCalledTimes(1));
    expect(mockPh.identify).toHaveBeenCalledWith("42", {
      name: "Test User",
      email: "test@example.com",
      username: "tuser",
    });
    expect(mockGetAuthorizedUserByEmail).not.toHaveBeenCalled();
  });

  it("does not identify, and never looks the user up, when the session has no id", async () => {
    mockUseSession.mockReturnValue({
      status: "authenticated",
      data: { user: sessionUser },
    });

    render(
      <PHProvider>
        <div />
      </PHProvider>,
    );

    await Promise.resolve();
    expect(mockPh.identify).not.toHaveBeenCalled();
    expect(mockGetAuthorizedUserByEmail).not.toHaveBeenCalled();
  });

  it("resets when unauthenticated", () => {
    mockUseSession.mockReturnValue({ status: "unauthenticated", data: null });

    render(
      <PHProvider>
        <div />
      </PHProvider>,
    );

    expect(mockPh.reset).toHaveBeenCalledTimes(1);
    expect(mockPh.identify).not.toHaveBeenCalled();
  });
});
