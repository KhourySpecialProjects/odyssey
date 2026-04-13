import { DropletList } from "@/components/group/group-management-droplet-list";
import { render, screen } from "@testing-library/react";
import { makeDroplet, makeTag } from "@/lib/testing/mock-helpers";

describe("DropletList", () => {
  const mockDroplets = Array.from({ length: 12 }, (_, i) =>
    makeDroplet({
      id: i + 1,
      name: `Droplet ${i + 1}`,
      slug: `droplet-${i + 1}`,
      type: "knowledge",
      tags: [makeTag({ id: 1, name: "React" })],
      learningObjectives: [],
      status: "published",
      focusArea: "personal",
      isHidden: false,
    }),
  );

  const mockDropletWithDescription = {
    ...mockDroplets[0],
    description: "<p>This is a test description for the droplet.</p>",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders all droplets in the list", () => {
      const onReorder = jest.fn();
      const onRemove = jest.fn();

      render(
        <DropletList
          droplets={mockDroplets}
          onReorder={onReorder}
          onRemove={onRemove}
        />,
      );

      mockDroplets.forEach((droplet) => {
        expect(screen.getByText(droplet.name)).toBeInTheDocument();
      });
    });

    it("renders droplet with correct information", () => {
      const onReorder = jest.fn();
      const onRemove = jest.fn();

      render(
        <DropletList
          droplets={mockDroplets}
          onReorder={onReorder}
          onRemove={onRemove}
        />,
      );

      expect(screen.getByText("Droplet 1")).toBeInTheDocument();
    });

    it("renders focus area badge", () => {
      const onReorder = jest.fn();
      const onRemove = jest.fn();

      render(
        <DropletList
          droplets={mockDroplets}
          onReorder={onReorder}
          onRemove={onRemove}
        />,
      );

      expect(screen.getAllByText("Personal")[0]).toBeInTheDocument();
    });
  });
});
