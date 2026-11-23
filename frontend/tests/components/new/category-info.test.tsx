import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateDropletForm } from "@/components/new/new-droplet-form";
import { DROPLET_FOCUS_AREAS, DROPLET_TYPES } from "@/lib/droplet-categories";

jest.mock("@/lib/requests/droplet", () => ({
  createDroplet: jest.fn(),
  getDroplets: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("@/lib/globals", () => ({
  DROPLET_FILTERS: [
    {
      name: "focusArea",
      label: "Focus Area",
      options: [{ value: "personal", label: "Personal" }],
    },
    {
      name: "type",
      label: "Type",
      options: [
        { value: "knowledge", label: "Knowledge" },
        { value: "skill", label: "Skill" },
      ],
    },
  ],
}));

const author = {
  name: "Test Author",
  email: "test@example.com",
  image: null,
  roles: [],
  isActive: true,
} as never;

describe("Type and Focus Area info icons", () => {
  it("renders both icon buttons as non-submitting buttons", () => {
    render(<CreateDropletForm tags={[]} author={author} />);

    for (const name of [
      "What do Knowledge and Skill mean?",
      "What do the focus areas mean?",
    ]) {
      const button = screen.getByRole("button", { name });
      expect(button).toHaveAttribute("type", "button");
    }
  });

  it("shows the Knowledge and Skill descriptions on click", async () => {
    render(<CreateDropletForm tags={[]} author={author} />);
    expect(
      screen.queryByText(DROPLET_TYPES[0].description),
    ).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "What do Knowledge and Skill mean?" }),
    );

    for (const type of DROPLET_TYPES) {
      expect(screen.getByText(type.description)).toBeInTheDocument();
    }
  });

  it("shows the focus area descriptions via the keyboard and closes on Escape", async () => {
    render(<CreateDropletForm tags={[]} author={author} />);
    const button = screen.getByRole("button", {
      name: "What do the focus areas mean?",
    });

    button.focus();
    await userEvent.keyboard("{Enter}");
    for (const area of DROPLET_FOCUS_AREAS) {
      expect(screen.getByText(area.description)).toBeInTheDocument();
    }

    await userEvent.keyboard("{Escape}");
    expect(
      screen.queryByText(DROPLET_FOCUS_AREAS[0].description),
    ).not.toBeInTheDocument();
  });
});
