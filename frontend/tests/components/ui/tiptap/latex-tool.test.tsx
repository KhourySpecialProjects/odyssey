import { render, screen, fireEvent } from '@testing-library/react'
import LatexTool from '@/components/ui/tiptap/toolbar/tools/latex-tool'
import { Editor } from '@tiptap/react'

describe('LatexTool', () => {
  const mockEditor = {
    chain: jest.fn().mockReturnThis(),
    focus: jest.fn().mockReturnThis(),
    insertContent: jest.fn().mockReturnThis(),
    run: jest.fn(),
    view: {
      state: {
        selection: {
          $from: {
            node: () => ({ type: { name: 'doc' } })
          }
        }
      }
    }
  } as unknown as Editor & {
    chain: jest.Mock;
    focus: jest.Mock;
    insertContent: jest.Mock;
    run: jest.Mock;
    isActive: jest.Mock;
  }

  it('renders latex button', () => {
    render(<LatexTool editor={mockEditor} />)
    expect(screen.getByTitle('LaTeX')).toBeInTheDocument()
  })

  it('opens popover with options when clicked', () => {
    render(<LatexTool editor={mockEditor} />)
    fireEvent.click(screen.getByTitle('LaTeX'))
    expect(screen.getByText('Inline LaTeX')).toBeInTheDocument()
    expect(screen.getByText('Block LaTeX')).toBeInTheDocument()
  })

  it('inserts inline latex when no text is selected', () => {
    render(<LatexTool editor={mockEditor} />)
    fireEvent.click(screen.getByTitle('LaTeX'))
    fireEvent.click(screen.getByText('Inline LaTeX'))
    expect(mockEditor.insertContent).toHaveBeenCalledWith('$$')
  })
})