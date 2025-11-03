import { DropletList } from "@/components/group/group-management-droplet-list";
import {
  DropletLesson,
  DropletStatus,
  DropletType,
  FocusArea,
  LearningObjective,
  Tag,
} from "@/types";
import { render, screen, fireEvent } from "@testing-library/react";

describe("DropletList", () => {
  const mockDroplets = Array.from({ length: 12 }, (_, i) => ({
    id: i + 1,
    name: `Droplet ${i + 1}`,
    slug: `droplet-${i + 1}`,
    completionPercentage: i * 10,
    lessons: Array.from({ length: i + 1 }, (_, j) => ({
      id: j + 1,
      name: `Lesson ${j + 1}`,
    })) as any,
    type: "knowledge" as DropletType,
    tags: [{ id: 1, name: "React" }] as Tag[],
    learningObjectives: [] as LearningObjective[],
    status: "published" as DropletStatus,
    droplet_lessons: [] as DropletLesson[],
    focusArea: "personal" as FocusArea,
    isHidden: false,
  }));

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
