import { render, screen } from '@testing-library/react'
import { DropletNameInput } from '@/components/ui/tiptap/droplet-name-input'

describe('DropletNameInput', () => {
  const mockProps = {
    initialContent: '<h1>Test Name</h1>',
    updateContent: jest.fn()
  }

  it('renders editor with initial content', () => {
    render(<DropletNameInput {...mockProps} />)
    expect(screen.getByText('Test Name')).toBeInTheDocument()
  })

  it('applies correct heading styling', () => {
    const { container } = render(<DropletNameInput {...mockProps} />)
    expect(container.querySelector('h1')).toHaveClass(
      'text-6xl',
      'font-black',
      'text-slate-900'
    )
  })

  it('applies correct container styling', () => {
    const { container } = render(<DropletNameInput {...mockProps} />)
    const editor = container.querySelector('.tiptap')
    expect(editor).toHaveClass('hover:shadow', 'focus:shadow-lg')
  })
})


