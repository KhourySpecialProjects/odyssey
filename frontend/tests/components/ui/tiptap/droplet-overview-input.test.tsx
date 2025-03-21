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
    const placeholderElement = screen.getByRole('textbox');
    expect(placeholderElement.querySelector('p')).toHaveAttribute('data-placeholder', 'Nothing here yet...')
  })

  it('applies correct styling', () => {
    render(<DropletOverviewInput {...mockProps} />)
    const editor = screen.getByRole('textbox')
    expect(editor).toHaveClass(
      'prose',
      'prose-sky',
      'w-full',
      'max-w-2xl',
      'p-8',
      'mt-4',
      'border',
      'rounded-md',
      'bg-slate-50',
      'dark:bg-slate-800',
      'border-slate-200',
      'dark:text-slate-300',
      'dark:border-slate-500',
      'hover:shadow',
      'focus:shadow-lg',
      'outline-none'
    )
  })
})


