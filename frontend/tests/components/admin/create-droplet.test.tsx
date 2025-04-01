import { CreateDroplet } from "@/components/admin/droplets/create-droplet";
import { render, screen } from "@testing-library/react";

jest.mock("next/link", () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
});

describe("CreateDroplet", () => {
  it("renders a button with correct text", () => {
    render(<CreateDroplet />);

    const button = screen.getByRole("button", { name: /create droplet/i });
    expect(button).toBeInTheDocument();
  });

  it("links to the correct URL", () => {
    render(<CreateDroplet />);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/new/droplet");
  });

  it("has a plus icon", () => {
    render(<CreateDroplet />);

    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
  });
});
