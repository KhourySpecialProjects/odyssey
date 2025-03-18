import { render, screen, fireEvent } from '@testing-library/react'
import OrderedListTool from '@/components/ui/tiptap/toolbar/tools/ordered-list-tool'
import { Editor } from '@tiptap/react'

describe('OrderedListTool', () => {
  const mockEditor = {
    chain: jest.fn().mockReturnThis(),
    focus: jest.fn().mockReturnThis(),
    toggleOrderedList: jest.fn().mockReturnThis(),
    run: jest.fn(),
    isActive: jest.fn()
  } as unknown as Editor & {
    chain: jest.Mock;
    focus: jest.Mock;
    toggleOrderedList: jest.Mock;
    run: jest.Mock;
    isActive: jest.Mock;
  }

  it('renders ordered list button', () => {
    render(<OrderedListTool editor={mockEditor} />)
    expect(screen.getByTitle('Ordered list')).toBeInTheDocument()
  })

  it('toggles ordered list when clicked', () => {
    render(<OrderedListTool editor={mockEditor} />)
    fireEvent.click(screen.getByTitle('Ordered list'))
    
    expect(mockEditor.toggleOrderedList).toHaveBeenCalled()
  })

  it('applies active styling when list is active', () => {
    mockEditor.isActive.mockReturnValue(true)
    const { container } = render(<OrderedListTool editor={mockEditor} />)
    expect(container.firstChild).toHaveClass('bg-slate-200', 'dark:bg-slate-700')
  })
})