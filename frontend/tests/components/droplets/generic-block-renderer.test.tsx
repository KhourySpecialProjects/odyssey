import { render, screen, fireEvent } from '@testing-library/react'
import { Highlight, HighlightColor } from '@/types'
import GenericBlockRenderer from '@/components/droplets/lessons/GenericBlockRenderer'

// Mock highlight.js
jest.mock('highlight.js', () => ({
  highlightAll: jest.fn()
}))

// Mock katex
jest.mock('katex', () => ({
  renderToString: jest.fn((tex) => `rendered-${tex}`)
}))

describe('GenericBlockRenderer', () => {
  const mockProps = {
    block: {
      id: 1,
      content: 'Test content'
    },
    highlights: [] as Highlight[],
    onHighlight: jest.fn(),
    onDeleteHighlight: jest.fn(),
    onNote: jest.fn(),
    genericBlocks: [1],
    enrollmentId: '123',
    expanded: false,
    setExpanded: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders content correctly', () => {
    render(<GenericBlockRenderer {...mockProps} />)
    expect(screen.getByText('Test content')).toBeInTheDocument()
  })

  it('processes LaTeX content correctly', () => {
    const propsWithLatex = {
      ...mockProps,
      block: {
        ...mockProps.block,
        content: 'Test with inline $latex$ and block $$latex$$'
      }
    }
    
    render(<GenericBlockRenderer {...propsWithLatex} />)
    expect(screen.getByText(/Test with inline/)).toBeInTheDocument()
  })

  it('handles text selection and highlighting', () => {
    render(<GenericBlockRenderer {...mockProps} />)
    
    const content = screen.getByText('Test content')
    fireEvent.mouseUp(content)
    
    const mockSelection = {
      toString: () => 'Selected text',
      getRangeAt: () => ({
        cloneRange: () => ({}),
        startContainer: document.createTextNode('Test content'),
        startOffset: 0,
        endOffset: 12
      }),
      isCollapsed: false
    }
    
    window.getSelection = () => mockSelection as unknown as Selection
    
    fireEvent.mouseUp(content)
    expect(mockProps.onHighlight).not.toHaveBeenCalled()
  })

  it('renders existing highlights', () => {
    const propsWithHighlights = {
      ...mockProps,
      highlights: [{
        id: 1,
        text: 'Test',
        position: { start: 0, end: 4 },
        color: '#fff300' as HighlightColor
      }]
    }
    
    render(<GenericBlockRenderer {...propsWithHighlights} />)
    const highlightedElement = screen.getByText('Test')
    expect(highlightedElement.parentElement).toHaveStyle({
      backgroundColor: '#fff300'
    })
  })
})