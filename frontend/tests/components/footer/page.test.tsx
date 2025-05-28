import { render, screen } from "@testing-library/react";
import Footer from "@/components/footer/page";

jest.mock("next-auth", () => ({
  getServerSession: () => Promise.resolve(null),
}));

jest.mock("@/lib/auth/session", () => ({
  getCurrentUser: () => Promise.resolve(null),
}));

jest.mock("@/components/debug/reportBugButton", () => ({
  ReportBugButton: () => (
    <button data-testid="report-bug-button">Report Bug</button>
  ),
}));

jest.mock("next/headers", () => ({
  headers: () => new Map(),
  cookies: () => new Map(),
}));

describe("Footer", () => {
  it("renders all navigation links", async () => {
    const FooterComponent = await Footer();
    render(FooterComponent);

    expect(screen.getByText("About Odyssey")).toHaveAttribute("href", "/about");
    expect(screen.getByText("Website Creators")).toHaveAttribute(
      "href",
      "/website-creators",
    );
    expect(screen.getByText("Content Creators")).toHaveAttribute(
      "href",
      "/content-creators",
    );
    expect(screen.getByText("FAQ")).toHaveAttribute("href", "/faq");
  });
});
