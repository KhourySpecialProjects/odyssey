import { render, fireEvent, act } from '@testing-library/react'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider
} from '@/components/ui/tooltip'

describe('Tooltip', () => {
  const TestTooltip = () => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>Hover me</TooltipTrigger>
        <TooltipContent>Tooltip content</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )

  it('renders tooltip trigger', () => {
    const { getByText } = render(<TestTooltip />)
    expect(getByText('Hover me')).toBeInTheDocument()
  })

  it('shows tooltip content on hover', async () => {
    const { getByText } = render(<TestTooltip />)
    
    await act(async () => {
      fireEvent.mouseEnter(getByText('Hover me'))
      // Wait for animation
      await new Promise(resolve => setTimeout(resolve, 100))
    })
    
    expect(getByText('Tooltip content')).toBeInTheDocument()
  })

  it('applies default styling to content', () => {
    const { getByText } = render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>Trigger</TooltipTrigger>
          <TooltipContent>Content</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
    
    const content = getByText('Content')
    expect(content).toHaveClass(
      'z-50',
      'rounded-md',
      'border',
      'bg-white'
    )
  })

  it('accepts custom sideOffset', () => {
    const { getByText } = render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>Trigger</TooltipTrigger>
          <TooltipContent sideOffset={10}>Content</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
    
    expect(getByText('Content')).toHaveAttribute('data-side-offset', '10')
  })
})