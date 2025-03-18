import { render, screen } from '@testing-library/react'
import { DropletOverviewInput } from '@/components/ui/tiptap/droplet-overview-input'

describe('DropletOverviewInput', () => {
  const mockProps = {
    initialContent: '<p>Test overview</p>',
    updateContent: jest.fn()
  }

  it('renders editor with initial content', () => {
    render(<DropletOverviewInput {...mockProps} />)
    expect(screen.getByText('Test overview')).toBeInTheDocument()
  })

  it('renders placeholder when empty', () => {
    render(<DropletOverviewInput {...mockProps} initialContent="" />)
    expect(screen.getByText('Nothing here yet...')).toBeInTheDocument()
  })

  it('applies correct styling', () => {
    const { container } = render(<DropletOverviewInput {...mockProps} />)
    expect(container.firstChild).toHaveClass(
      'prose',
      'prose-sky',
      'w-full',
      'max-w-2xl',
      'p-8',
      'mt-4',
      'border',
      'rounded-md'
    )
  })
})
