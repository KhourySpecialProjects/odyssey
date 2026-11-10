import { render } from "@testing-library/react";
import { DropletTile } from "@/components/droplets/droplet-tile";
import { Droplet } from "@/types";

jest.mock("@/lib/requests/droplet", () => ({}));
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

const droplet = {
  id: 1,
  name: "Test Droplet",
  slug: "test-droplet",
  focusArea: "frontend",
  type: "tutorial",
  status: "published",
  lessons: [],
} as unknown as Droplet;

describe("DropletTile drag (ODY-472)", () => {
  it.each([
    ["full", {}],
    ["compact", { compact: true }],
    ["profile", { profilePage: true }],
  ])("%s tile link is not draggable", (_name, props) => {
    const { container } = render(<DropletTile droplet={droplet} {...props} />);
    const link = container.querySelector('a[href="/d/test-droplet"]');
    expect(link).toHaveAttribute("draggable", "false");
  });
});
