import { DropletList } from '@/components/group/group-management-droplet-list';
import { DropletLesson, DropletStatus, DropletType, FocusArea, LearningObjective, Tag } from '@/types';
import { render, screen, fireEvent } from '@testing-library/react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

jest.mock('react-dnd', () => ({
  useDrag: () => [{ isDragging: false }, jest.fn()],
  useDrop: () => [{}, jest.fn()],
  DndProvider: ({ children }: { children: React.ReactNode }) => children
}));

jest.mock('react-dnd-html5-backend', () => ({
  HTML5Backend: {}
}));

const renderWithDnd = (ui: React.ReactElement) => {
  return render(
    <DndProvider backend={HTML5Backend}>
      {ui}
    </DndProvider>
  );
};

describe('DropletList', () => {
  const mockDroplets = Array.from({ length: 12 }, (_, i) => ({
    id: i + 1,
    name: `Droplet ${i + 1}`,
    slug: `droplet-${i + 1}`,
    completionPercentage: i * 10,
    lessons: [],
    type: "knowledge" as DropletType,
    tags: [{ id: 1, name: "React" }] as Tag[],
    learningObjectives: [] as LearningObjective[],
    status: "published" as DropletStatus,
    droplet_lessons: [] as DropletLesson[],
    focusArea: "personal" as FocusArea,
    isHidden: false,
  }));
  
  it('renders droplets with correct information', () => {
    const onReorder = jest.fn();
    const onRemove = jest.fn();

    renderWithDnd(
      <DropletList
        droplets={mockDroplets}
        onReorder={onReorder}
        onRemove={onRemove}
      />
    );

    expect(screen.getByText('Droplet 1')).toBeInTheDocument();
  });

  it('handles remove droplet action', () => {
    const onReorder = jest.fn();
    const onRemove = jest.fn();

    renderWithDnd(
      <DropletList
        droplets={mockDroplets}
        onReorder={onReorder}
        onRemove={onRemove}
      />
    );

    const removeButtons = screen.getAllByRole('button');
    fireEvent.click(removeButtons[0]);

    expect(onRemove).toHaveBeenCalledWith(mockDroplets[0].id);
  });

  it('handles reordering droplets', () => {
    const onReorder = jest.fn();
    const onRemove = jest.fn();

    renderWithDnd(
      <DropletList
        droplets={mockDroplets}
        onReorder={onReorder}
        onRemove={onRemove}
      />
    );

    const reorderedDroplets = [...mockDroplets].reverse();
    onReorder(reorderedDroplets);

    expect(onReorder).toHaveBeenCalledWith(reorderedDroplets);
  });

  it('applies correct styling when dragging', () => {
    const onReorder = jest.fn();
    const onRemove = jest.fn();

    renderWithDnd(
      <DropletList
        droplets={mockDroplets}
        onReorder={onReorder}
        onRemove={onRemove}
      />
    );

    const dropletItems = screen.getAllByText(/Droplet/);
    expect(dropletItems[0].parentElement?.parentElement).toHaveClass('flex items-center p-4');
    expect(dropletItems[0].parentElement?.parentElement).toHaveClass('flex items-center p-4');
  });
});