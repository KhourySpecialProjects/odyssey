import { render, screen } from '@testing-library/react'
import { GenericBlockInput } from '@/components/ui/tiptap/generic-block-input'

describe('GenericBlockInput', () => {
  const mockProps = {
    initialContent: '<p>Test content</p>',
    updateContent: jest.fn(),
    revalidate: jest.fn()
  }

  it('renders editor with initial content', () => {
    render(<GenericBlockInput {...mockProps} />)
    expect(screen.getByText('Test content')).toBeInTheDocument()
  })

  it('renders toolbar with droplet mode enabled', () => {
    render(<GenericBlockInput {...mockProps} />)
    expect(screen.getByTitle('LaTeX')).toBeInTheDocument()
  })

  it('renders placeholder when empty', () => {
    render(<GenericBlockInput {...mockProps} initialContent="" />)
    expect(screen.getByText('Nothing here yet...')).toBeInTheDocument()
  })
})