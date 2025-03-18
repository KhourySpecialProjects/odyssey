import { render, screen, fireEvent } from '@testing-library/react'
import { NotesFilter } from '@/components/droplets/notes-filter'
import { NoteTypeTitle } from '@/lib/globals'

describe('NotesFilter', () => {
  const mockOnFilterChange = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders all color options', () => {
    render(<NotesFilter onFilterChange={mockOnFilterChange} />)
    
    expect(screen.getByText('Pink')).toBeInTheDocument()
    expect(screen.getByText('Orange')).toBeInTheDocument()
    expect(screen.getByText('Yellow')).toBeInTheDocument()
    expect(screen.getByText('Green')).toBeInTheDocument()
    expect(screen.getByText('Blue')).toBeInTheDocument()
  })

  it('starts with all colors selected', () => {
    render(<NotesFilter onFilterChange={mockOnFilterChange} />)
    
    const checkboxes = screen.getAllByRole('checkbox')
    checkboxes.forEach(checkbox => {
      expect(checkbox).toBeChecked()
    })
  })

  it('handles color toggle correctly', () => {
    render(<NotesFilter onFilterChange={mockOnFilterChange} />)
    
    const pinkCheckbox = screen.getByLabelText('Pink')
    fireEvent.click(pinkCheckbox)

    expect(mockOnFilterChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        NoteTypeTitle.Orange,
        NoteTypeTitle.Yellow,
        NoteTypeTitle.Green,
        NoteTypeTitle.Blue
      ])
    )
  })
})