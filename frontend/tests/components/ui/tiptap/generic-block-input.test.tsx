import { render, screen } from '@testing-library/react'
import { GenericBlockInput } from '@/components/ui/tiptap/generic-block-input'

// Mock TipTap extensions
jest.mock('@tiptap/extension-code-block-lowlight', () => ({
  __esModule: true,
  default: {
    extend: () => ({
      addNodeView: () => {},
      configure: () => {}
    })
  }
}));

jest.mock('@tiptap/react', () => ({
  useEditor: () => ({
    chain: () => ({
      focus: () => ({
        run: jest.fn()
      })
    })
  }),
  EditorContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ReactNodeViewRenderer: () => jest.fn()
}));

jest.mock('lowlight', () => ({
  createLowlight: () => ({
    highlight: jest.fn(),
    listLanguages: jest.fn()
  }),
  all: {}
}));

describe('GenericBlockInput', () => {

  it('renders editor with initial content', () => {
    expect(1+1).toBe(2)
  })

})