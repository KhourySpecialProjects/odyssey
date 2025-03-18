import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { updateNoteContent } from '@/lib/requests/notes'
import { NoteBlock } from '@/components/droplets/lessons/note-taking/note-block'
import { DropletStatus, DropletType, FocusArea, HighlightColor, Tag } from '@/types'

jest.mock('@/lib/requests/notes')

describe('NoteBlock', () => {
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
    note: mockNote,
    onUpdate: jest.fn(),
    disabled: false,
    onDelete: jest.fn(),
    onFocus: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders note content and highlight', () => {
    render(<NoteBlock {...mockProps} />)
    
    expect(screen.getByText('Highlighted text')).toBeInTheDocument()
    expect(screen.getByText('Test note content')).toBeInTheDocument()
  })

  it('handles content updates', async () => {
    (updateNoteContent as jest.Mock).mockResolvedValue({ success: true })

    render(<NoteBlock {...mockProps} />)
    
    const editor = screen.getByRole('textbox')
    fireEvent.change(editor, { target: { value: 'Updated content' } })
    fireEvent.blur(editor)

    await waitFor(() => {
      expect(updateNoteContent).toHaveBeenCalledWith(1, 'Updated content')
      expect(mockProps.onUpdate).toHaveBeenCalled()
    })
  })

  it('handles note deletion', () => {
    render(<NoteBlock {...mockProps} />)
    
    const deleteButton = screen.getByRole('button', { name: /delete/i })
    fireEvent.click(deleteButton)

    expect(mockProps.onDelete).toHaveBeenCalledWith(1)
  })

  it('handles focus state', () => {
    render(<NoteBlock {...mockProps} />)
    
    const editor = screen.getByRole('textbox')
    fireEvent.focus(editor)

    expect(mockProps.onFocus).toHaveBeenCalledWith(1)
  })
})