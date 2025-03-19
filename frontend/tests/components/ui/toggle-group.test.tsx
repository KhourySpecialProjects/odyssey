import { render, fireEvent } from '@testing-library/react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

describe('ToggleGroup', () => {
  const TestToggleGroup = () => (
    <ToggleGroup type="single">
      <ToggleGroupItem value="1">Option 1</ToggleGroupItem>
      <ToggleGroupItem value="2">Option 2</ToggleGroupItem>
    </ToggleGroup>
  )

  it('renders toggle group with items', () => {
    const { getByText } = render(<TestToggleGroup />)
    expect(getByText('Option 1')).toBeInTheDocument()
    expect(getByText('Option 2')).toBeInTheDocument()
  })

  it('applies default styling', () => {
    const { container } = render(<TestToggleGroup />)
    expect(container.firstChild).toHaveClass(
      'rounded-3xl',
      'px-2',
      'py-2',
      'space-x-2'
    )
  })

  it('handles item selection', () => {
    const onValueChange = jest.fn()
    const { getByText } = render(
      <ToggleGroup type="single" onValueChange={onValueChange}>
        <ToggleGroupItem value="1">Option 1</ToggleGroupItem>
      </ToggleGroup>
    )
    
    fireEvent.click(getByText('Option 1'))
    expect(onValueChange).toHaveBeenCalledWith('1')
  })

  it('applies selected state styling to items', () => {
    const { getByText } = render(
      <ToggleGroup type="single" defaultValue="1">
        <ToggleGroupItem value="1">Option 1</ToggleGroupItem>
      </ToggleGroup>
    )
    
    expect(getByText('Option 1').parentElement).toHaveClass('border-slate-200 dark:border-slate-500')
  })
})