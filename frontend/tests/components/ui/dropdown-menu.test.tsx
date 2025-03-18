import { render, screen, fireEvent } from '@testing-library/react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'

describe('DropdownMenu', () => {
  const TestDropdown = () => (
    <DropdownMenu>
      <DropdownMenuTrigger>Menu</DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem>Item 1</DropdownMenuItem>
        <DropdownMenuCheckboxItem checked={true}>Checkbox</DropdownMenuCheckboxItem>
        <DropdownMenuRadioItem value="radio">Radio</DropdownMenuRadioItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  it('renders trigger button', () => {
    render(<TestDropdown />)
    expect(screen.getByText('Menu')).toBeInTheDocument()
  })

  it('shows menu content when triggered', () => {
    render(<TestDropdown />)
    fireEvent.click(screen.getByText('Menu'))
    expect(screen.getByText('Actions')).toBeInTheDocument()
    expect(screen.getByText('Item 1')).toBeInTheDocument()
  })

  it('renders checkbox item with correct state', () => {
    render(<TestDropdown />)
    fireEvent.click(screen.getByText('Menu'))
    const checkbox = screen.getByText('Checkbox')
    expect(checkbox).toHaveAttribute('data-state', 'checked')
  })
})