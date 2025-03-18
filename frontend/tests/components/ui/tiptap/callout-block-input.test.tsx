import { render, screen } from '@testing-library/react'
import { CalloutBlockInput } from '@/components/ui/tiptap/callout-block-input'

describe('CalloutBlockInput', () => {
  const mockProps = {
    initialContent: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Test content' }] }] },
    updateContent: jest.fn(),
    revalidate: jest.fn()
  }

  it('renders editor with initial content', () => {
    render(<CalloutBlockInput {...mockProps} />)
    expect(screen.getByText('Test content')).toBeInTheDocument()
  })

  it('renders toolbar', () => {
    render(<CalloutBlockInput {...mockProps} />)
    expect(screen.getByRole('toolbar')).toBeInTheDocument()
  })

  it('renders placeholder when empty', () => {
    render(<CalloutBlockInput {...mockProps} initialContent={{ type: 'doc', content: [] }} />)
    expect(screen.getByText('Nothing here yet...')).toBeInTheDocument()
  })
})
