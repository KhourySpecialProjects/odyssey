import { render, screen } from "@testing-library/react";
import AboutPage from "@/app/(general)/about/page";
import { DROPLET_FOCUS_AREAS, DROPLET_TYPES } from "@/lib/droplet-categories";

jest.mock("@/components/gradient-bg", () => ({
  GradientBackground: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

describe("AboutPage", () => {
  it("renders every type and focus area with its description", async () => {
    render(await AboutPage());

    expect(screen.getByText("Types")).toBeInTheDocument();
    expect(screen.getByText("Focus Areas")).toBeInTheDocument();
    for (const item of [...DROPLET_TYPES, ...DROPLET_FOCUS_AREAS]) {
      expect(screen.getByText(`${item.name} Droplets`)).toBeInTheDocument();
      expect(screen.getByText(item.description)).toBeInTheDocument();
    }
  });
});
