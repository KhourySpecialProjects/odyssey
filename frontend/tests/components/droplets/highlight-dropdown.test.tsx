import { HighlightDropdown } from '@/components/droplets/lessons/highlight-dropdown'
import { HighlightColor } from '@/types'
import { render, screen, fireEvent } from '@testing-library/react'

describe('HighlightDropdown', () => {
  const mockProps = {
    selectedColor: '#fff300' as HighlightColor,
    handleApplyColor: jest.fn(),
    isHighlighting: false,
    setIsHighlighting: jest.fn(),
    handlePopupHighlight: jest.fn(),
    handlePopupDelete: jest.fn(),
    handleCreateNote: jest.fn(),
    setExpanded: jest.fn(),
    expanded: false
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('calls color selection handler', () => {
    render(<HighlightDropdown {...mockProps} />)
    
    const pinkButton = screen.getByTitle('Highlight Pink')
    fireEvent.click(pinkButton)
    
    expect(mockProps.handleApplyColor).toHaveBeenCalledWith('#f9a8d4')
  })
})