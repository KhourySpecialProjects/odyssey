import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { markLessonAsComplete } from '@/lib/actions'
import { LessonRenderer } from '@/components/droplets/lessons/lesson-renderer'

jest.mock('@/lib/actions')
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: jest.fn()
  })
}))

describe('LessonRenderer', () => {
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

  const mockDroplet = {
    id: 1,
    droplet_lessons: [
      {
        id: 1,
        lesson: mockLesson,
        orderIndex: 1
      }
    ],
    shouldBeLocked: false
  }

  const mockProps = {
    lesson: mockLesson,
    droplet: mockDroplet,
    enrollmentId: '123',
    completedLessonIds: [],
    user: null,
    author: false,
    onUpdate: jest.fn(),
    expanded: false,
    setExpanded: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('handles lesson completion', async () => {
    (markLessonAsComplete as jest.Mock).mockResolvedValue(true)

    render(<LessonRenderer {...mockProps} />)
    
    const completeButton = screen.getByText('Mark as complete')
    fireEvent.click(completeButton)

    await waitFor(() => {
      expect(markLessonAsComplete).toHaveBeenCalledWith('123', [], 1)
    })
  })

  it('shows locked state when appropriate', () => {
    const lockedProps = {
      ...mockProps,
      droplet: {
        ...mockDroplet,
        shouldBeLocked: true,
        droplet_lessons: []
      }
    }

    render(<LessonRenderer {...lockedProps} />)
    
    expect(screen.getByText(/Lesson Locked/i)).toBeInTheDocument()
  })
})