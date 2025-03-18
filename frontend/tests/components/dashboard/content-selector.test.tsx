// In content-selector.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { ContentSelector } from "@/components/dashboard/content-selector";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

// Mock Next.js navigation hooks
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
  usePathname: jest.fn(),
}));

describe("ContentSelector", () => {
  const mockUser = {
    id: 1,
    email: "test@example.com",
    roles: [],
    isActive: true,
  };

  const mockRouter = {
    push: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (usePathname as jest.Mock).mockReturnValue("/dashboard");

    const mockSearchParams = new URLSearchParams("tab=droplets");
    (useSearchParams as jest.Mock).mockReturnValue({
      get: (key: string) => mockSearchParams.get(key),
      toString: () => mockSearchParams.toString(),
      [Symbol.iterator]: () => mockSearchParams[Symbol.iterator](),
    });
  });

  it("navigates to the correct URL when a tab is clicked", () => {
    render(<ContentSelector user={mockUser} />);

    fireEvent.click(screen.getByText("Playlists"));

    expect(mockRouter.push).toHaveBeenCalledWith("/dashboard?tab=playlists");
  });
});
