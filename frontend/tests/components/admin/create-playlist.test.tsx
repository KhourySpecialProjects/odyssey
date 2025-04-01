import { CreatePlaylist } from "@/components/admin/playlists/create-playlist";
import { render, screen } from "@testing-library/react";

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

describe("CreatePlaylist", () => {
  it("renders a button with correct text", () => {
    render(<CreatePlaylist />);

    const button = screen.getByRole("button", { name: /create playlist/i });
    expect(button).toBeInTheDocument();
  });

  it("links to the correct URL", () => {
    render(<CreatePlaylist />);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/new/playlist");
  });
});
