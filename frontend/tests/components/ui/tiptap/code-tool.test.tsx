import { render, screen, fireEvent } from '@testing-library/react'
import CodeTool from '@/components/ui/tiptap/toolbar/tools/code-tool/code-tool'
import { Editor } from '@tiptap/react'

describe('CodeTool', () => {
  const mockEditor = {
    chain: jest.fn().mockReturnThis(),
    focus: jest.fn().mockReturnThis(),
    toggleCodeBlock: jest.fn().mockReturnThis(),
    run: jest.fn(),
    isActive: jest.fn()
  } as unknown as Editor & {
    chain: jest.Mock;
    focus: jest.Mock;
    toggleCodeBlock: jest.Mock;
    run: jest.Mock;
    isActive: jest.Mock;
  }

  it('renders code button', () => {
    render(<CodeTool editor={mockEditor} />)
    expect(screen.getByTitle('Code')).toBeInTheDocument()
  })

  it('toggles code block when clicked', () => {
    render(<CodeTool editor={mockEditor} />)
    fireEvent.click(screen.getByTitle('Code'))
    
    expect(mockEditor.chain).toHaveBeenCalled()
    expect(mockEditor.focus).toHaveBeenCalled()
    expect(mockEditor.toggleCodeBlock).toHaveBeenCalled()
    expect(mockEditor.run).toHaveBeenCalled()
  })

  it('applies active styling when code block is active', () => {
    mockEditor.isActive.mockReturnValue(true)
    const { container } = render(<CodeTool editor={mockEditor} />)
    
    expect(container.firstChild).toHaveClass('bg-slate-200', 'dark:bg-slate-700')
  })
})