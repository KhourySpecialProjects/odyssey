import { render, screen, fireEvent } from '@testing-library/react'
import BoldTool from '@/components/ui/tiptap/toolbar/tools/bold-tool'
import { Editor } from '@tiptap/react'

describe('BoldTool', () => {
  const mockEditor = {
    chain: jest.fn().mockReturnThis(),
    focus: jest.fn().mockReturnThis(),
    toggleBold: jest.fn().mockReturnThis(),
    run: jest.fn(),
    isActive: jest.fn()
  } as unknown as Editor & {
    chain: jest.Mock;
    focus: jest.Mock;
    toggleBold: jest.Mock;
    run: jest.Mock;
    isActive: jest.Mock;
  }

  it('renders bold button', () => {
    render(<BoldTool editor={mockEditor} />)
    expect(screen.getByTitle('Bold')).toBeInTheDocument()
  })

  it('toggles bold when clicked', () => {
    render(<BoldTool editor={mockEditor} />)
    fireEvent.click(screen.getByTitle('Bold'))
    
    expect(mockEditor.chain).toHaveBeenCalled()
    expect(mockEditor.focus).toHaveBeenCalled()
    expect(mockEditor.toggleBold).toHaveBeenCalled()
    expect(mockEditor.run).toHaveBeenCalled()
  })

  it('applies active styling when bold is active', () => {
    mockEditor.isActive.mockReturnValue(true)
    const { container } = render(<BoldTool editor={mockEditor} />)
    
    expect(container.firstChild).toHaveClass('bg-slate-200', 'dark:bg-slate-700')
  })
})