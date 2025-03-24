import { render, screen } from '@testing-library/react'
import { ExpandableBlockInput } from '@/components/ui/tiptap/expandable-block-input'

// Mock lowlight
jest.mock('lowlight', () => ({
  createLowlight: () => ({
    highlight: jest.fn(),
    listLanguages: jest.fn()
  }),
  all: {}
}));

// Mock TipTap dependencies
jest.mock('@tiptap/react', () => ({
  useEditor: () => ({
    commands: {
      setContent: jest.fn(),
    },
    getHTML: () => '',
    chain: () => ({
      focus: () => ({ run: jest.fn() })
    }),
  }),
  EditorContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

jest.mock('@tiptap/extension-code-block-lowlight', () => ({
  default: {
    configure: () => ({
      addNodeView: jest.fn()
    })
  }
}));

jest.mock('@tiptap/starter-kit', () => ({
  default: {
    configure: () => ({})
  }
}));

describe('ExpandableBlockInput', () => {
  const mockProps = {
    initialContent: '<p>Test content</p>',
    updateContent: jest.fn()
  }

  it('renders placeholder when empty', () => {
    render(<ExpandableBlockInput {...mockProps} initialContent="" />)
    expect(screen.getByText('Nothing here yet...')).toBeInTheDocument()
  })
})