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
})