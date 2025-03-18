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

  it('renders custom placeholder', () => {
    render(<GeneralTextEditor {...mockProps} initialContent="" />)
    expect(screen.getByText('Custom placeholder')).toBeInTheDocument()
  })

  it('renders with default placeholder when not provided', () => {
    render(<GeneralTextEditor {...mockProps} placeholder={undefined} initialContent="" />)
    expect(screen.getByText('Enter text...')).toBeInTheDocument()
  })

  it('applies additional className when provided', () => {
    const { container } = render(<GeneralTextEditor {...mockProps} className="test-class" />)
    expect(container.querySelector('.test-class')).toBeInTheDocument()
  })
})