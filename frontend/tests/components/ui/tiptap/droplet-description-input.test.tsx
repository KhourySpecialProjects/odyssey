import { render, screen } from '@testing-library/react'
import { DropletDescriptionInput } from '@/components/ui/tiptap/droplet-description-input'

describe('DropletDescriptionInput', () => {
  const mockProps = {
    initialContent: '<p>Test description</p>',
    updateContent: jest.fn()
  }

  it('renders editor with initial content', () => {
    render(<DropletDescriptionInput {...mockProps} />)
    expect(screen.getByText('Test description')).toBeInTheDocument()
  })

  it('renders placeholder when empty', () => {
    render(<DropletDescriptionInput {...mockProps} initialContent="" />)
    expect(screen.getByText('Type droplet description here...')).toBeInTheDocument()
  })

  it('applies correct styling', () => {
    const { container } = render(<DropletDescriptionInput {...mockProps} />)
    expect(container.firstChild).toHaveClass('hover:shadow', 'focus:shadow-lg')
  })
})
