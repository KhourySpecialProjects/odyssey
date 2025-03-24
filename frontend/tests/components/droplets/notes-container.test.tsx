import { NotesContainer } from '@/components/droplets/notes-container'
import { DropletStatus, DropletType, FocusArea, HighlightColor, Tag } from '@/types'
import { render, screen, fireEvent } from '@testing-library/react'

describe('NotesContainer', () => {
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
  const mockNote = {
    id: 1,
    content: 'Test note content',
    lesson: {
      id: 1,
      name: 'Test Lesson',
      slug: 'test-lesson',
      blocks: [],
      droplets: [],
      droplet_lessons: [],
      notes: []
    },
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
    positionY: 0,
    highlight: {
      text: 'Highlighted text',
      color: '#fff300' as HighlightColor,
      position: {start: 0, end: 0}
    }
  }
  const mockProps = {
    dropletHighlights: [
      {
        id: 1,
        text: 'Highlight 1',
        color: '#fff300' as HighlightColor,
        position: {start: 0, end: 0}
      }
    ],
    dropletNotes: [
      mockNote
    ],
    mappedLessons: [
      {
        id: 1,
        lesson: {
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
        },
        orderIndex: 1
      }
    ],
    allNotes: {
      dropletId: 1,
      notes: [],
      highlights: []
    }
  }

  it('renders summary and filter sections', () => {
    render(<NotesContainer {...mockProps} />)
    
    expect(screen.getByText('Filters')).toBeInTheDocument()
  })

  it('handles filter changes', () => {
    render(<NotesContainer {...mockProps} />)

    const filterOptions = screen.getAllByRole('checkbox')
    fireEvent.click(filterOptions[0])
  })

})