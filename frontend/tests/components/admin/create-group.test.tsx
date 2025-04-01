import { render, screen } from "@testing-library/react";
import { CreateGroup } from "@/components/admin/groups/create-group";

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

describe("CreateGroup", () => {
  it("renders a button with correct text", () => {
    render(<CreateGroup />);

    const button = screen.getByRole("button", { name: /create group/i });
    expect(button).toBeInTheDocument();
  });

  it("links to the correct URL", () => {
    render(<CreateGroup />);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/g/management");
  });
});
