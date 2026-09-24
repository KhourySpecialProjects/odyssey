import { render, screen, fireEvent } from "@testing-library/react";
import { ContentTypeSelector } from "@/components/explore/content-type-selector";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
  usePathname: jest.fn(),
}));

describe("ContentTypeSelector", () => {
  const mockRouter = { push: jest.fn() };
  const mockSearchParams = new URLSearchParams();

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
    (usePathname as jest.Mock).mockReturnValue("/explore");
  });

  it("renders both content type buttons", () => {
    render(<ContentTypeSelector droplets={0} playlists={0} />);
    expect(screen.getByText("Droplets (0)")).toBeInTheDocument();
    expect(screen.getByText("Playlists (0)")).toBeInTheDocument();
  });

  it("updates URL when clicking content type", () => {
    render(<ContentTypeSelector droplets={0} playlists={0} />);
    fireEvent.click(screen.getByText("Playlists (0)"));
    expect(mockRouter.push).toHaveBeenCalledWith(
      "/explore?contentType=playlists",
    );
  });

  it("starts the new tab on its first page", () => {
    (useSearchParams as jest.Mock).mockReturnValue(
      new URLSearchParams("contentType=droplets&page=3&q=data"),
    );
    render(<ContentTypeSelector droplets={0} playlists={0} />);
    fireEvent.click(screen.getByText("Playlists (0)"));
    expect(mockRouter.push).toHaveBeenCalledWith(
      "/explore?contentType=playlists&q=data",
    );
  });

  it("highlights Droplets when the URL has an unknown content type", () => {
    (useSearchParams as jest.Mock).mockReturnValue(
      new URLSearchParams("contentType=bogus"),
    );
    render(<ContentTypeSelector droplets={1} playlists={2} />);
    expect(screen.getByText("Droplets (1)")).toHaveClass("bg-[#287697]");
    expect(screen.getByText("Playlists (2)")).not.toHaveClass("bg-[#287697]");
  });
});
