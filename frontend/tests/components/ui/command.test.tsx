import { render, fireEvent } from '@testing-library/react'
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command'


window.HTMLElement.prototype.scrollIntoView = jest.fn();

describe('Command', () => {
  const TestCommand = () => (
    <Command>
      <CommandInput placeholder="Search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Suggestions">
          <CommandItem>Item 1</CommandItem>
          <CommandSeparator />
          <CommandItem>Item 2</CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  )

  it('renders command input', () => {
    const { getByPlaceholderText } = render(<TestCommand />)
    expect(getByPlaceholderText('Search...')).toBeInTheDocument()
  })

  it('renders command items', () => {
    const { getByText } = render(<TestCommand />)
    expect(getByText('Item 1')).toBeInTheDocument()
    expect(getByText('Item 2')).toBeInTheDocument()
  })

  it('applies correct styling to components', () => {
    const { container } = render(<TestCommand />)
    expect(container.firstChild).toHaveClass('flex', 'h-full', 'w-full')
  })

  it('handles input changes', () => {
    const { getByPlaceholderText } = render(<TestCommand />)
    const input = getByPlaceholderText('Search...')
    fireEvent.change(input, { target: { value: 'test' } })
    expect(input).toHaveValue('test')
  })
})