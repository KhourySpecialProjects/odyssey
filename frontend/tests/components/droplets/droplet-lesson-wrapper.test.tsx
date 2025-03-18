import { render, screen, fireEvent } from '@testing-library/react';
import { DropletLessonWrapper } from '@/components/droplets/lessons/droplet-lesson-wrapper';
import { getNotesByAuthorizedUserAndLesson } from '@/lib/requests/notes';

jest.mock('@/lib/requests/notes', () => ({
  getNotesByAuthorizedUserAndLesson: jest.fn()
}));

describe('DropletLessonWrapper', () => {
  const mockLesson = {
    id: 1,
    name: 'Test Lesson',
    slug: 'test-lesson'
  };

  const mockDroplet = {
    id: 1,
    name: 'Test Droplet',
    slug: 'test-droplet'
  };

  beforeEach(() => {
    (getNotesByAuthorizedUserAndLesson as jest.Mock).mockResolvedValue([]);
  });

  it('renders lesson content', () => {
    render(
      <DropletLessonWrapper
        lesson={mockLesson as any}
        droplet={mockDroplet as any}
        completedLessonIds={[]}
        author={false}
        authUser={{ id: 1 } as any}
        userId={1}
      />
    );
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('toggles notes sidebar', () => {
    render(
      <DropletLessonWrapper
        lesson={mockLesson as any}
        droplet={mockDroplet as any}
        enrollmentId="1"
        completedLessonIds={[]}
        author={false}
        authUser={{ id: 1 } as any}
        userId={1}
      />
    );
    
    const notesButton = screen.getByRole('button', { name: /notes/i });
    fireEvent.click(notesButton);
    expect(screen.getByRole('complementary')).toHaveClass('right-0');
  });
});