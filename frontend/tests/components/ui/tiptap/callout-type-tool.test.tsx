import { render, screen, fireEvent } from '@testing-library/react'
import CalloutTypeTool from '@/components/ui/tiptap/toolbar/tools/callout-type-tool'

describe('CalloutTypeTool', () => {
  const mockBlock = {
    content: 'Test content',
    type: 'info',
    color: 'bg-sky-50'
  }
  const mockUpdateBlock = jest.fn()

  it('renders menu button', () => {
    render(<CalloutTypeTool block={mockBlock} updateBlock={mockUpdateBlock} />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('opens popover on click', () => {
    render(<CalloutTypeTool block={mockBlock} updateBlock={mockUpdateBlock} />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('Warning')).toBeInTheDocument()
  })

  it('updates block type when option is selected', () => {
    render(<CalloutTypeTool block={mockBlock} updateBlock={mockUpdateBlock} />)
    fireEvent.click(screen.getByRole('button'))
    fireEvent.click(screen.getByText('Warning'))

    expect(mockUpdateBlock).toHaveBeenCalledWith({
      __component: 'droplets.callout',
      content: mockBlock.content,
      type: 'info',
      color: 'bg-red-300'
    })
  })
})