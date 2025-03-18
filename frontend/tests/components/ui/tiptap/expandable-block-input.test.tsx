import { render, screen } from '@testing-library/react'
import { ExpandableBlockInput } from '@/components/ui/tiptap/expandable-block-input'

describe('ExpandableBlockInput', () => {
  const mockProps = {
    initialContent: '<p>Test content</p>',
    updateContent: jest.fn()
  }

  it('renders editor with initial content', () => {
    render(<ExpandableBlockInput {...mockProps} />)
    expect(screen.getByText('Test content')).toBeInTheDocument()
  })

  it('renders toolbar', () => {
    render(<ExpandableBlockInput {...mockProps} />)
    expect(screen.getByRole('toolbar')).toBeInTheDocument()
  })

  it('renders placeholder when empty', () => {
    render(<ExpandableBlockInput {...mockProps} initialContent="" />)
    expect(screen.getByText('Nothing here yet...')).toBeInTheDocument()
  })
})