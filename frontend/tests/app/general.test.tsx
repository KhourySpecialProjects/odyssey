import { render, screen } from "@testing-library/react";
import { getServerSession } from "next-auth";
import { getProviders, type ClientSafeProvider } from "next-auth/react";
import NotFoundRoute from "@/app/(general)/not-found";
import UnauthorizedRoute from "@/app/(general)/unauthorized/page";
import HomeRoute from "@/app/(general)/page";
import RequestAccessPage from "@/app/(general)/request-access/page";
import SignIn from "@/app/(general)/auth/login/page";
import { getCurrentUser } from "@/lib/auth/session";
import { getLoginProviders } from "@/lib/auth/login-providers";
import { getRandomFunFactDroplet } from "@/lib/requests/droplet";

jest.mock("@/lib/auth/session", () => ({
  getCurrentUser: jest.fn(),
}));

// Signed-in redirects moved to middleware.ts; these mocks only exist so the
// tests can assert the pages no longer read the session or fetch data.
jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("next-auth/react", () => ({
  getProviders: jest.fn(),
  signIn: jest.fn(),
}));

jest.mock("@/lib/requests/droplet", () => ({
  getRandomFunFactDroplet: jest.fn(),
}));

jest.mock("@/lib/auth/login-providers", () => ({
  getLoginProviders: jest.fn(),
}));

jest.mock("@/components/requests/access-request-form", () => ({
  RequestAccessForm: () => <form aria-label="request access form" />,
}));

const loginProviders: Record<string, ClientSafeProvider> = {
  "azure-ad": {
    id: "azure-ad",
    name: "Azure Active Directory",
    type: "oauth",
    signinUrl: "http://localhost:3000/api/auth/signin/azure-ad",
    callbackUrl: "http://localhost:3000/api/auth/callback/azure-ad",
  },
  github: {
    id: "github",
    name: "GitHub",
    type: "oauth",
    signinUrl: "http://localhost:3000/api/auth/signin/github",
    callbackUrl: "http://localhost:3000/api/auth/callback/github",
  },
};

describe("General Pages", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("HomeRoute", () => {
    it("renders the anonymous calls to action", () => {
      render(<HomeRoute />);

      expect(
        screen.getByRole("link", { name: "Start Exploring" }),
      ).toHaveAttribute("href", "/explore");
      expect(
        screen.getByRole("link", { name: "Request Access" }),
      ).toHaveAttribute("href", "/request-access");
      expect(
        screen.queryByRole("link", { name: /Create a Droplet/ }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("link", { name: /Request Creation Role/ }),
      ).not.toBeInTheDocument();
    });

    it("reads no session and fetches no data", () => {
      render(<HomeRoute />);

      expect(getCurrentUser).not.toHaveBeenCalled();
      expect(getServerSession).not.toHaveBeenCalled();
      expect(getRandomFunFactDroplet).not.toHaveBeenCalled();
    });
  });

  describe("RequestAccessPage", () => {
    it("renders the form without reading the session", () => {
      render(<RequestAccessPage />);

      expect(
        screen.getByRole("heading", { name: "Request Access" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("form", { name: "request access form" }),
      ).toBeInTheDocument();
      expect(getServerSession).not.toHaveBeenCalled();
    });
  });

  describe("SignIn", () => {
    it("renders a button per configured provider without self-fetching", () => {
      jest.mocked(getLoginProviders).mockReturnValue(loginProviders);

      render(<SignIn />);

      expect(
        screen.getByRole("button", { name: "Log in with My Northeastern" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Log in with\s+GitHub/ }),
      ).toBeInTheDocument();
      expect(getLoginProviders).toHaveBeenCalledTimes(1);
      expect(getProviders).not.toHaveBeenCalled();
    });
  });

  describe("UnauthorizedRoute", () => {
    it("renders no access message", () => {
      render(<UnauthorizedRoute />);

      expect(
        screen.getByText(
          "You do not have permission to access this application.",
        ),
      ).toBeInTheDocument();
    });
  });

  describe("NotFoundRoute", () => {
    it("renders not found message", () => {
      render(<NotFoundRoute />);
      expect(
        screen.getByText(
          "The requested resource does not exist, or you do not have access to it.",
        ),
      ).toBeInTheDocument();
    });

    it("renders home page link", () => {
      render(<NotFoundRoute />);
      expect(screen.getByText("Return to Home Page")).toBeInTheDocument();
    });
  });
});
