import { render, screen } from "@testing-library/react";
import NotFoundRoute from "@/app/(general)/not-found";
import UnauthorizedRoute from "@/app/(general)/unauthorized/UnauthorizedRoute";
import { fetchAccessRequests } from "@/lib/requests/data";

jest.mock("@/lib/auth/session", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("@/lib/requests/data", () => ({
  fetchAccessRequests: jest.fn(),
}));

describe("General Pages", () => {
  describe("UnauthorizedRoute", () => {
    const mockFetchAccessRequests = fetchAccessRequests as jest.Mock;

    beforeEach(() => {
      // Clear all mocks before each test
      jest.clearAllMocks();
    });

    it("renders no access message when no email is provided", async () => {
      // Mock empty access requests
      mockFetchAccessRequests.mockResolvedValue([]);

      render(await UnauthorizedRoute({ email: "" }));

      expect(
        screen.getByText(
          "You do not have permission to access this application. Please request access so that we can process your request!",
        ),
      ).toBeInTheDocument();
    });

    it("renders no access message when email is provided but not in access requests", async () => {
      // Mock access requests without the test email
      mockFetchAccessRequests.mockResolvedValue([
        { email: "other@example.com", id: 1, status: "pending" },
      ]);

      render(await UnauthorizedRoute({ email: "test@example.com" }));

      expect(
        screen.getByText(
          "You do not have permission to access this application. Please request access so that we can process your request!",
        ),
      ).toBeInTheDocument();
    });

    it("renders processing message when email exists in access requests", async () => {
      const testEmail = "test@example.com";

      // Mock access requests with the test email
      mockFetchAccessRequests.mockResolvedValue([
        { email: testEmail, id: 1, status: "pending" },
        { email: "other@example.com", id: 2, status: "pending" },
      ]);

      render(await UnauthorizedRoute({ email: testEmail }));

      expect(
        screen.getByText(
          `We are currently processing a request for ${testEmail}`,
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
