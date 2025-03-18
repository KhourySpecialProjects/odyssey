import { render, fireEvent } from '@testing-library/react'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

describe('RadioGroup', () => {
  const TestRadioGroup = () => (
    <RadioGroup defaultValue="option1">
      <RadioGroupItem value="option1" id="option1" />
      <RadioGroupItem value="option2" id="option2" />
    </RadioGroup>
  )

  it('renders radio items', () => {
    const { container } = render(<TestRadioGroup />)
    expect(container.querySelectorAll('button[role="radio"]')).toHaveLength(2)
  })

  it('selects correct option', () => {
    const { container } = render(<TestRadioGroup />)
    const option2 = container.querySelector('#option2')
    fireEvent.click(option2 as Element)
    expect(option2).toHaveAttribute('data-state', 'checked')
  })

  it('applies correct styling', () => {
    const { container } = render(<TestRadioGroup />)
    expect(container.firstChild).toHaveClass('grid', 'gap-2')
  })
})