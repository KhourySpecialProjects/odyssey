import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { getNotesByAuthorizedUserAndLesson, createNote, updateNotePosition } from '@/lib/requests/notes'
import { getEnrollByID } from '@/lib/requests/enrollment'
import { NotesBar } from '@/components/droplets/lessons/note-taking/notes-bar'
import { DropletStatus, DropletType, FocusArea, Tag } from '@/types'

// Mock the API requests
jest.mock('@/lib/requests/notes')
jest.mock('@/lib/requests/enrollment')
jest.mock('@/lib/actions', () => ({
  deleteNote: jest.fn()
}))

describe('NotesBar', () => {
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
    name: 'Test Droplet',
    slug: 'test-droplet',
    isHidden: false,
    focusArea: 'personal' as FocusArea,
    type: 'knowledge' as DropletType,
    tags: [{ id: 1, name: 'React' }] as Tag[],
    learningObjectives: [],
    status: "published" as DropletStatus,
    droplet_lessons: []
  };

  const mockInitNotes = [
    {
      id: 1,
      content: 'Test note 1',
      positionY: 100,
      lesson: mockLesson,
      enrollment: {
        id: "1",
        authorizedUser: { id: 1 },
        droplet: mockDroplet,
        viewedLessons: [],
        isComplete: false,
        rating: 5,
        notes: [],
        isFirstTime: false,
        isArchived: false
      },
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    ;(getNotesByAuthorizedUserAndLesson as jest.Mock).mockResolvedValue(mockInitNotes)
  })

  it('renders notes correctly', () => {
    render(
      <NotesBar
        userId={1}
        lesson={mockLesson}
        enrollmentId="123"
        initNotes={mockInitNotes}
      />
    )
    
    expect(screen.getByText('My Notes')).toBeInTheDocument()
    expect(screen.getByText('Test note 1')).toBeInTheDocument()
  })

  it('handles note dragging', async () => {
    render(
      <NotesBar
        userId={1}
        lesson={mockLesson}
        enrollmentId="123"
        initNotes={mockInitNotes}
      />
    )

    const noteElement = screen.getByText('Test note 1')
    const gripHandle = noteElement.closest('.note-block')!.querySelector('.grip-handle')!

    fireEvent.mouseDown(gripHandle, { clientY: 100 })
 
    fireEvent.mouseMove(document, { clientY: 200 })
   
    fireEvent.mouseUp(document)

    await waitFor(() => {
      expect(updateNotePosition).toHaveBeenCalled()
    })
  })
})