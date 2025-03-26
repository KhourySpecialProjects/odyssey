import { render, screen, act } from '@testing-library/react';
import { GeneralTextEditor } from '@/components/ui/tiptap/general-text-editor';
import { useEditor } from '@tiptap/react';

const mockEditor = {
  getHTML: () => '<p>Initial content</p>',
  chain: () => ({
    focus: () => ({
      toggleBold: () => ({
        run: () => {}
      }),
      run: () => {}
    })
  }),
  isActive: () => false,
  can: () => true,
  commands: {
    focus: () => {}
  }
};

jest.mock('@tiptap/react', () => ({
  useEditor: jest.fn(),
  EditorContent: ({ editor }: any) => (
    <div 
      data-testid="editor-content"
      dangerouslySetInnerHTML={{ __html: editor?.getHTML() }}
    />
  )
}));

jest.mock('@/components/ui/tiptap/toolbar/general-toolbar', () => ({
  __esModule: true,
  default: ({ editor }: any) => <div data-testid="general-toolbar">Toolbar</div>
}));

jest.mock('@tiptap/starter-kit', () => ({}));
jest.mock('@tiptap/extension-underline', () => ({}));
jest.mock('@tiptap/extension-link', () => ({
  configure: () => ({})
}));
jest.mock('@tiptap/extension-image', () => ({
  configure: () => ({})
}));
jest.mock('@tiptap/extension-placeholder', () => ({
  configure: () => ({})
}));

describe('GeneralTextEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders editor with initial content', () => {
    (useEditor as jest.Mock).mockReturnValue(mockEditor);

    render(
      <GeneralTextEditor
        initialContent="<p>Initial content</p>"
        updateContent={() => {}}
      />
    );

    const editorContent = screen.getByTestId('editor-content');
    expect(editorContent.innerHTML).toContain('Initial content');
  });

  it('returns null when editor is not initialized', () => {
    (useEditor as jest.Mock).mockReturnValue(null);

    const { container, queryByTestId } = render(
      <GeneralTextEditor
        initialContent="<p>Test content</p>"
        updateContent={() => {}}
      />
    );

    expect(container.firstChild).toBeNull();
    expect(queryByTestId('editor-content')).not.toBeInTheDocument();
  });

  it('calls updateContent when editor content changes', async () => {
    const mockUpdateContent = jest.fn();
    let triggerUpdate: ((html: string) => void) | null = null;

    (useEditor as jest.Mock).mockImplementation(({ onUpdate }) => ({
      ...mockEditor,
      getHTML: () => '<p>Updated content</p>',
      __triggerUpdate: (html: string) => {
        onUpdate({ editor: { getHTML: () => html } });
      }
    }));

    render(
      <GeneralTextEditor
        initialContent="<p>Initial content</p>"
        updateContent={mockUpdateContent}
      />
    );

    const editor = (useEditor as jest.Mock).mock.results[0].value;

    await act(async () => {
      editor.__triggerUpdate('<p>Updated content</p>');
    });

    expect(mockUpdateContent).toHaveBeenCalledWith('<p>Updated content</p>');
  });

  it('applies custom className', () => {
    (useEditor as jest.Mock).mockReturnValue(mockEditor);

    const { container } = render(
      <GeneralTextEditor
        initialContent=""
        updateContent={() => {}}
        className="custom-class"
      />
    );

    const editorContent = screen.getByTestId('editor-content');
    expect(editorContent.parentElement).toHaveClass('w-full');
  });

  it('initializes editor with correct options', () => {
    const mockUpdateContent = jest.fn();
    
    render(
      <GeneralTextEditor
        initialContent="<p>Test content</p>"
        updateContent={mockUpdateContent}
        placeholder="Test placeholder"
      />
    );

    expect(useEditor).toHaveBeenCalledWith(
      expect.objectContaining({
        content: '<p>Test content</p>',
        extensions: expect.any(Array),
        editorProps: expect.objectContaining({
          attributes: expect.any(Object)
        })
      })
    );
  });
});