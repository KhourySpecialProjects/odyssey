import { render, screen, fireEvent } from '@testing-library/react'
import HeadingTool from '@/components/ui/tiptap/toolbar/tools/heading-tool'
import { Editor } from '@tiptap/react'

describe('HeadingTool', () => {
  const mockEditor = {
    chain: jest.fn().mockReturnThis(),
    focus: jest.fn().mockReturnThis(),
    toggleHeading: jest.fn().mockReturnThis(),
    run: jest.fn(),
    isActive: jest.fn()
  } as unknown as Editor & {
    chain: jest.Mock;
    focus: jest.Mock;
    toggleHeading: jest.Mock;
    run: jest.Mock;
    isActive: jest.Mock;
  }

  it('renders heading buttons with correct titles', () => {
    render(<HeadingTool editor={mockEditor} number={1} />)
    expect(screen.getByTitle('Heading 1')).toBeInTheDocument()
  })

  it('toggles heading when clicked', () => {
    render(<HeadingTool editor={mockEditor} number={1} />)
    fireEvent.click(screen.getByTitle('Heading 1'))
    
    expect(mockEditor.chain).toHaveBeenCalled()
    expect(mockEditor.toggleHeading).toHaveBeenCalledWith({ level: 1 })
  })

  it('applies active styling when heading is active', () => {
    mockEditor.isActive.mockReturnValue(true)
    const { container } = render(<HeadingTool editor={mockEditor} number={1} />)
    
    expect(container.firstChild).toHaveClass('bg-slate-200', 'dark:bg-slate-700')
  })
})