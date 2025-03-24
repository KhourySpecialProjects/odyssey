import { render, screen, fireEvent, act } from '@testing-library/react'
import { LessonRenderer } from '@/components/draft/lesson/lesson-renderer'
import { updateLesson, deleteLesson } from '@/lib/actions'
import { useRouter } from 'next/navigation'

// Mock all dependencies that might use ES Modules
jest.mock('@/components/ui/tiptap/lesson-name-input', () => ({
  LessonNameInput: ({ initialContent, updateContent }: any) => (
    <div data-testid="lesson-name-input">
      <input 
        type="text" 
        defaultValue={initialContent}
        onChange={(e) => updateContent(e.target.value)}
      />
    </div>
  )
}))

jest.mock('@/components/draft/lesson/blocks/expandable', () => ({
  ExpandableEditor: ({ block, updateBlock, deleteBlock }: any) => (
    <div data-testid="expandable-editor">
      Mock Expandable Editor
      <button onClick={deleteBlock}>Delete</button>
    </div>
  )
}))

jest.mock('@/components/draft/lesson/blocks/video', () => ({
  VideoEditor: ({ block, updateBlock, deleteBlock }: any) => (
    <div data-testid="video-editor">
      Mock Video Editor
      <button onClick={deleteBlock}>Delete</button>
    </div>
  )
}))

jest.mock('@/components/draft/lesson/blocks/generic', () => ({
  GenericEditor: ({ block, updateBlock, deleteBlock }: any) => (
    <div data-testid="generic-editor">
      Mock Generic Editor
      <button onClick={deleteBlock}>Delete</button>
    </div>
  )
}))

jest.mock('@/components/draft/lesson/blocks/callout', () => ({
  CalloutEditor: ({ block, updateBlock, deleteBlock }: any) => (
    <div data-testid="callout-editor">
      Mock Callout Editor
      <button onClick={deleteBlock}>Delete</button>
    </div>
  )
}))

jest.mock('@/components/draft/lesson/blocks/quiz', () => ({
  QuizEditor: ({ block, updateBlock, deleteBlock }: any) => (
    <div data-testid="quiz-editor">
      Mock Quiz Editor
      <button onClick={deleteBlock}>Delete</button>
    </div>
  )
}))

jest.mock('@/components/draft/lesson/blocks/open-ended-quiz', () => ({
  OpenEndedQuizEditor: ({ block, updateBlock, deleteBlock }: any) => (
    <div data-testid="open-ended-quiz-editor">
      Mock Open Ended Quiz Editor
      <button onClick={deleteBlock}>Delete</button>
    </div>
  )
}))

jest.mock('@/lib/actions', () => ({
  updateLesson: jest.fn(),
  deleteLesson: jest.fn()
}))

jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}))

jest.mock('lodash', () => ({
  debounce: (fn: Function) => fn
}))

describe('LessonRenderer', () => {
  const mockRouter = {
    replace: jest.fn()
  }

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
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
  })

  it('regenerates slug when requested', async () => {
    (updateLesson as jest.Mock).mockResolvedValueOnce({
      data: { attributes: { slug: 'new-slug' } }
    })

    render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />)
    
    const regenerateButton = screen.getByText('Regenerate URL Slug')
    fireEvent.click(regenerateButton)

    expect(updateLesson).toHaveBeenCalledWith(
      mockLesson.id,
      { name: mockLesson.name },
      { regenerateSlug: true }
    )

    await act(async () => {
      await Promise.resolve()
    })

    expect(mockRouter.replace).toHaveBeenCalledWith('/draft/d/test-droplet/new-slug')
  })

  it('renders different block types correctly', () => {
    const mockLessonWithAllBlocks = {
      ...mockLesson,
      blocks: [
        { __component: 'droplets.video', id: 1 },
        { __component: 'droplets.generic', id: 2 },
        { __component: 'droplets.expandable', id: 3 },
        { __component: 'droplets.callout', id: 4 },
        { __component: 'droplets.quiz', questions: [], id: 5 },
        { __component: 'droplets.open-ended-quiz', questions: [], id: 6 }
      ]
    }

    render(<LessonRenderer lesson={mockLessonWithAllBlocks} dropletSlug="test-droplet" />)

    expect(screen.getByTestId('video-editor')).toBeInTheDocument()
    expect(screen.getByTestId('generic-editor')).toBeInTheDocument()
    expect(screen.getByTestId('expandable-editor')).toBeInTheDocument()
    expect(screen.getByTestId('callout-editor')).toBeInTheDocument()
    expect(screen.getByTestId('quiz-editor')).toBeInTheDocument()
    expect(screen.getByTestId('open-ended-quiz-editor')).toBeInTheDocument()
  })
})