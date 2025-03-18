import { renderHook, act } from '@testing-library/react';
import { addLesson } from '@/lib/actions';
import { useLessons } from '@/components/draft/metadata/hooks/useLessons';

jest.mock('@/lib/actions');

describe('useLessons', () => {
  const mockLesson = {
    id: 1,
    name: 'Test Lesson',
    slug: 'test-lesson',
    droplet_lessons: [],
    droplets: [],
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
  const mockDroplet = {
    id: 1,
    lessons: [
       mockLesson,
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with droplet lessons', () => {
    const { result } = renderHook(() => useLessons(mockDroplet));
    expect(result.current.lessons).toEqual(mockDroplet.lessons);
  });

  it('should handle adding new lesson successfully', async () => {
    const newLesson = {
      id: 3,
      attributes: { slug: 'lesson-3' },
      name: 'Lesson 3',
    };

    (addLesson as jest.Mock).mockResolvedValue({
      ok: true,
      data: newLesson,
    });

    const { result } = renderHook(() => useLessons(mockDroplet));

    await act(async () => {
      const response = await result.current.addNewLesson({ name: 'Lesson 3' });
      expect(response).toEqual({ slug: 'lesson-3' });
    });

    expect(result.current.lessons).toHaveLength(3);
    expect(result.current.lessons).toContain(newLesson);
  });

  it('should handle error when adding lesson', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    (addLesson as jest.Mock).mockResolvedValue({
      ok: false,
      error: 'Failed to add lesson',
    });

    const { result } = renderHook(() => useLessons(mockDroplet));

    await act(async () => {
      await result.current.addNewLesson({ name: 'Lesson 3' });
    });

    expect(consoleSpy).toHaveBeenCalled();
    expect(result.current.lessons).toHaveLength(2);

    consoleSpy.mockRestore();
  });
});
