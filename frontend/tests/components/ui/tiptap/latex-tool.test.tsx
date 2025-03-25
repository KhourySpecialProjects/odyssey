import { render, screen, fireEvent } from '@testing-library/react'
import LatexTool from '@/components/ui/tiptap/toolbar/tools/latex-tool'
import { Editor } from '@tiptap/react'

jest.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('LatexTool', () => {
  beforeEach(() => {
    window.getSelection = jest.fn();
  });
  
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

  it('adds inline latex with empty selection', () => {
    const mockInsertContent = jest.fn().mockReturnValue({ run: jest.fn() });
    const mockEditor = {
      chain: () => ({
        focus: () => ({
          insertContent: mockInsertContent,
          run: jest.fn(),
        }),
      }),
      view: {
        state: {
          selection: {
            $from: {
              node: () => ({ type: { name: 'doc' } }),
            },
          },
        },
      },
    };

    (window.getSelection as jest.Mock).mockReturnValue(null);

    render(<LatexTool editor={mockEditor as any} />);
    
    const button = screen.getByRole('button', { name: 'Inline LaTeX' });
    fireEvent.click(button);
    expect(mockInsertContent).toHaveBeenCalledWith('$$');
  });

  it('adds block latex with selected text', () => {
    const mockGetRangeAt = jest.fn().mockReturnValue({
      deleteContents: jest.fn(),
      insertNode: jest.fn(),
    });
    const mockSelection = {
      toString: () => 'selected text',
      getRangeAt: mockGetRangeAt,
    };

    (window.getSelection as jest.Mock).mockReturnValue(mockSelection);

    render(<LatexTool editor={mockEditor as any} />);
    
    const button = screen.getByRole('button', { name: 'Block LaTeX' });
    fireEvent.click(button);
    expect(mockGetRangeAt).toHaveBeenCalled();
  });


  it('applies active class when popover is open', () => {
    const mockEditor = {
      chain: () => ({
        focus: () => ({
          run: jest.fn(),
        }),
      }),
      view: {
        state: {
          selection: {
            $from: {
              node: () => ({ type: { name: 'doc' } }),
            },
          },
        },
      },
    };

    render(<LatexTool editor={mockEditor as any} />);
    
    const triggerButton = screen.getByTitle('LaTeX');
    fireEvent.click(triggerButton);
    
    expect(triggerButton).toHaveClass('bg-slate-200');
  });
});
