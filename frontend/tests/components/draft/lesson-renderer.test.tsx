import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LessonRenderer } from '@/components/draft/lesson/lesson-renderer';
import { updateLesson, deleteLesson } from '@/lib/actions';
import { useRouter } from 'next/navigation';
import React from 'react';
import { Block } from '@/components/draft/lesson/lesson-renderer';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/lib/actions', () => ({
  updateLesson: jest.fn(),
  deleteLesson: jest.fn(),
}));

jest.mock('@/lib/utils', () => ({
  htmlToText: jest.fn(html => html.replace(/<\/?[^>]+(>|$)/g, "")),
  cn: (...inputs: any[]) => inputs.join(' '),
}));

jest.mock('@/components/draft/lesson/blocks/generic', () => ({
  GenericEditor: ({ block, updateBlock, deleteBlock }: {
    block: Block;
    updateBlock: (update: Partial<Block>) => void;
    deleteBlock: () => void;
  }) => (
    <div data-testid={`generic-block-${block.id}`}>
      <p>Generic Editor</p>
      <button onClick={() => updateBlock({ content: 'Updated content' })}>Update</button>
      <button onClick={deleteBlock}>Delete</button>
    </div>
  ),
}));

jest.mock('@/components/draft/lesson/blocks/expandable', () => ({
  ExpandableEditor: ({ block, updateBlock, deleteBlock }: {
    block: Block;
    updateBlock: (update: Partial<Block>) => void;
    deleteBlock: () => void;
  }) => (
    <div data-testid={`expandable-block-${block.id}`}>
      <p>Expandable Editor</p>
      <button onClick={() => updateBlock({ content: 'Updated content' })}>Update</button>
      <button onClick={deleteBlock}>Delete</button>
    </div>
  ),
}));

jest.mock('@/components/draft/lesson/blocks/video', () => ({
  VideoEditor: ({ block, updateBlock, deleteBlock }: {
    block: Block;
    updateBlock: (update: Partial<Block>) => void;
    deleteBlock: () => void;
  }) => (
    <div data-testid={`video-block-${block.id}`}>
      <p>Video Editor</p>
      <button onClick={() => updateBlock({ url: 'updated-url' })}>Update</button>
      <button onClick={deleteBlock}>Delete</button>
    </div>
  ),
}));

jest.mock('@/components/draft/lesson/blocks/callout', () => ({
  CalloutEditor: ({ block, updateBlock, deleteBlock }: {
    block: Block;
    updateBlock: (update: Partial<Block>) => void;
    deleteBlock: () => void;
  }) => (
    <div data-testid={`callout-block-${block.id}`}>
      <p>Callout Editor</p>
      <button onClick={() => updateBlock({ content: 'Updated content' })}>Update</button>
      <button onClick={deleteBlock}>Delete</button>
    </div>
  ),
}));

jest.mock('@/components/draft/lesson/blocks/quiz', () => ({
  QuizEditor: ({ block, updateBlock, deleteBlock }: {
    block: Block;
    updateBlock: (update: Partial<Block>) => void;
    deleteBlock: () => void;
  }) => (
    <div data-testid={`quiz-block-${block.id}`}>
      <p>Quiz Editor</p>
      <button onClick={() => updateBlock({ questions: [] })}>Update</button>
      <button onClick={deleteBlock}>Delete</button>
    </div>
  ),
}));

jest.mock('@/components/draft/lesson/blocks/open-ended-quiz', () => ({
  OpenEndedQuizEditor: ({ block, updateBlock, deleteBlock }: {
    block: Block;
    updateBlock: (update: Partial<Block>) => void;
    deleteBlock: () => void;
  }) => (
    <div data-testid={`open-ended-quiz-block-${block.id}`}>
      <p>Open Ended Quiz Editor</p>
      <button onClick={() => updateBlock({ questions: [] })}>Update</button>
      <button onClick={deleteBlock}>Delete</button>
    </div>
  ),
}));

jest.mock('@/components/ui/tiptap/lesson-name-input', () => ({
  LessonNameInput: ({ initialContent, updateContent }: {
    initialContent: string;
    updateContent: (content: string) => void;
  }) => (
    <div data-testid="lesson-name-input">
      <input
        defaultValue={initialContent.replace(/<\/?[^>]+(>|$)/g, "")}
        onChange={e => updateContent(e.target.value)}
      />
    </div>
  ),
}));

jest.mock('@/components/draft/lesson/add-block', () => ({
  AddBlock: ({ add }: { add: (block: Block) => void }) => (
    <button
      data-testid="add-block-button"
      onClick={() => add({ __component: 'droplets.generic', content: '', id: 999 })}
    >
      Add Block
    </button>
  ),
}));

jest.mock('@/components/draft/lesson/delete-lesson', () => ({
  DeleteLessonButton: ({ deleteLesson, dropletSlug }: {
    deleteLesson: () => void;
    dropletSlug: string;
  }) => (
    <button
      data-testid="delete-lesson-button"
      onClick={deleteLesson}
    >
      Delete Lesson
    </button>
  ),
}));

describe('LessonRenderer', () => {
  const mockRouter = {
    replace: jest.fn(),
  };

  const mockLesson = {
    id: 1,
    name: 'Test Lesson',
    slug: 'test-lesson',
    droplets: [],
    droplet_lessons: [],
    notes: [],
    blocks: [
      {
        id: 1,
        __component: 'droplets.generic',
        content: 'Generic content',
      },
      {
        id: 2,
        __component: 'droplets.expandable',
        title: 'Expandable title',
        content: 'Expandable content',
      },
      {
        id: 3,
        __component: 'droplets.video',
        url: 'https://example.com/video',
      },
      {
        id: 4,
        __component: 'droplets.callout',
        content: 'Callout content',
        type: 'info',
        color: 'bg-sky-50',
      },
      {
        id: 5,
        __component: 'droplets.quiz',
        questions: [
          {
            id: 1,
            content: 'Quiz question',
            answerOptions: [
              { id: 1, content: 'Option 1', isCorrect: true },
              { id: 2, content: 'Option 2', isCorrect: false },
            ],
          },
        ],
      },
      {
        id: 6,
        __component: 'droplets.open-ended-quiz',
        questions: [
          {
            id: 1,
            content: 'Open ended question',
            correctAnswer: 'Correct answer',
          },
        ],
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (updateLesson as jest.Mock).mockResolvedValue({
      ok: true,
      data: { attributes: { slug: 'updated-slug' } },
    });
  });

  it('renders all block editors based on block types', () => {
    render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />);

    // Check that all block editors are rendered
    expect(screen.getByTestId('generic-block-1')).toBeInTheDocument();
    expect(screen.getByTestId('expandable-block-2')).toBeInTheDocument();
    expect(screen.getByTestId('video-block-3')).toBeInTheDocument();
    expect(screen.getByTestId('callout-block-4')).toBeInTheDocument();
    expect(screen.getByTestId('quiz-block-5')).toBeInTheDocument();
    expect(screen.getByTestId('open-ended-quiz-block-6')).toBeInTheDocument();
  });

  it('renders the lesson name input', () => {
    render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />);

    expect(screen.getByTestId('lesson-name-input')).toBeInTheDocument();
  });

  it('renders add block buttons', () => {
    render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />);

    // There should be add block buttons between each block (7 total for 6 blocks)
    const addBlockButtons = screen.getAllByTestId('add-block-button');
    expect(addBlockButtons.length).toBe(7);
  });

  it('updates the block when block editor triggers update', async () => {
    render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />);

    // Click the update button in the generic block editor
    const button = screen.getByTestId('generic-block-1').querySelector('button:first-of-type');
    if (button) {
      fireEvent.click(button);
    }

    // Wait for the debounced update
    await waitFor(() => {
      expect(updateLesson).toHaveBeenCalledWith(
        mockLesson.id,
        {
          blocks: expect.arrayContaining([
            expect.objectContaining({
              id: 1,
              __component: 'droplets.generic',
              content: 'Updated content',
            }),
          ]),
        }
      );
    });
  });

  it('deletes a block when delete is triggered', async () => {
    (updateLesson as jest.Mock).mockResolvedValue({ ok: true });

    render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />);
    
    const button = screen.getByTestId('generic-block-1').querySelector('button:last-of-type');
    if (button) {
      fireEvent.click(button);
    }

    // Check that updateLesson was called without the deleted block
    expect(updateLesson).toHaveBeenCalledWith(
      mockLesson.id,
      {
        blocks: expect.not.arrayContaining([
          expect.objectContaining({
            id: 1,
          }),
        ]),
      },
      { reload: true }
    );
  });

  it('adds a new block when add block is clicked', async () => {
    (updateLesson as jest.Mock).mockResolvedValue({ ok: true });

    render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />);

    // Click the first add block button
    fireEvent.click(screen.getAllByTestId('add-block-button')[0]);

    // Check that updateLesson was called with the new block added
    expect(updateLesson).toHaveBeenCalledWith(
      mockLesson.id,
      {
        blocks: expect.arrayContaining([
          expect.objectContaining({
            __component: 'droplets.generic',
            content: '',
            id: 999,
          }),
        ]),
      },
      { reload: true }
    );
  });

  it('updates lesson name when name input changes', async () => {
    render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />);

    // Simulate changing the lesson name
    const nameInput = screen.getByTestId('lesson-name-input').querySelector('input');
    if (nameInput) {
      fireEvent.change(nameInput, { target: { value: 'Updated Lesson Name' } });
    }
    
    // Wait for the debounced update
    await waitFor(() => {
      expect(updateLesson).toHaveBeenCalledWith(
        mockLesson.id,
        {
          name: 'Updated Lesson Name',
        }
      );
    });

    // Check that router.replace was called with the new slug
    expect(mockRouter.replace).toHaveBeenCalledWith('/draft/d/test-droplet/updated-slug');
  });

  it('regenerates slug when regenerate button is clicked', async () => {
    render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />);

    fireEvent.click(screen.getByText('Regenerate URL Slug'));

    expect(updateLesson).toHaveBeenCalledWith(
      mockLesson.id,
      {
        name: 'Test Lesson',
      },
      { regenerateSlug: true }
    );

    expect(mockRouter.replace).toHaveBeenCalledWith('/draft/d/test-droplet/updated-slug');
  });

  it('deletes the lesson when delete button is clicked', async () => {
    (deleteLesson as jest.Mock).mockResolvedValue({ ok: true });

    render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />);

    fireEvent.click(screen.getByTestId('delete-lesson-button'));

    expect(deleteLesson).toHaveBeenCalledWith(mockLesson.id);
  });
});
