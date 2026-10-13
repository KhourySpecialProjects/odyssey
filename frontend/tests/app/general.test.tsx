import { render, screen } from "@testing-library/react";
import NotFoundRoute from "@/app/(general)/not-found";
import UnauthorizedRoute from "@/app/(general)/unauthorized/page";

jest.mock("@/lib/auth/session", () => ({
  getCurrentUser: jest.fn(),
}));

describe("General Pages", () => {
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
