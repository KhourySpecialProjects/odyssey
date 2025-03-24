import { render, screen } from '@testing-library/react'
import { GeneralTextEditor } from '@/components/ui/tiptap/general-text-editor'

describe('GeneralTextEditor', () => {
  const mockProps = {
    initialContent: '<p>Test content</p>',
    updateContent: jest.fn(),
    placeholder: 'Custom placeholder'
  }

  it('renders editor with initial content', () => {
    render(<GeneralTextEditor {...mockProps} />)
    expect(screen.getByText('Test content')).toBeInTheDocument()
  })

  it('applies additional className when provided', () => {
    const { container } = render(<GeneralTextEditor {...mockProps} className="test-class" />)
    expect(container.querySelector('.test-class')).toBeInTheDocument()
  })
})