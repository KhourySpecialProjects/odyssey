import { render, fireEvent } from '@testing-library/react'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue
} from '@/components/ui/select'

describe('Select', () => {
  const TestSelect = () => (
    <Select>
      <SelectTrigger>
        <SelectValue placeholder="Select option" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="1">Option 1</SelectItem>
        <SelectItem value="2">Option 2</SelectItem>
      </SelectContent>
    </Select>
  )

  it('renders select trigger', () => {
    const { getByText } = render(<TestSelect />)
    expect(getByText('Select option')).toBeInTheDocument()
  })

  it('shows options when clicked', () => {
    const { getByText, getByRole } = render(<TestSelect />)
    fireEvent.click(getByRole('combobox'))
    expect(getByText('Option 1')).toBeInTheDocument()
    expect(getByText('Option 2')).toBeInTheDocument()
  })

  it('applies correct styling to trigger', () => {
    const { getByRole } = render(<TestSelect />)
    expect(getByRole('combobox')).toHaveClass('flex', 'h-10', 'w-full', 'rounded-md')
  })
})