import { render, fireEvent } from '@testing-library/react'
import { CommandShortcut, CommandDialog } from '@/components/ui/command'
import { cn } from '@/lib/utils'
import '@testing-library/jest-dom'
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command'

jest.mock('@/lib/utils', () => ({
  cn: jest.fn((...inputs) => inputs.join(' '))
}))

jest.mock('@/lib/utils', () => ({
  cn: jest.fn((...inputs) => inputs.join(' '))
}))

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

describe('CommandShortcut', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders with default classes', () => {
    const { container } = render(<CommandShortcut>⌘+K</CommandShortcut>)
    
    const shortcut = container.firstChild as HTMLElement
    expect(shortcut.tagName.toLowerCase()).toBe('span')
    expect(cn).toHaveBeenCalledWith(
      'ml-auto text-xs tracking-widest text-slate-500 dark:text-slate-400',
      undefined
    )
  })

  it('combines custom className with default classes', () => {
    const { container } = render(
      <CommandShortcut className="custom-class">
        ⌘+K
      </CommandShortcut>
    )
    
    expect(cn).toHaveBeenCalledWith(
      'ml-auto text-xs tracking-widest text-slate-500 dark:text-slate-400',
      'custom-class'
    )
  })

  it('passes through additional props', () => {
    const { container } = render(
      <CommandShortcut 
        data-testid="shortcut"
        aria-label="Command K shortcut"
        title="Open command menu"
      >
        ⌘+K
      </CommandShortcut>
    )
    
    const shortcut = container.firstChild as HTMLElement
    expect(shortcut).toHaveAttribute('aria-label', 'Command K shortcut')
    expect(shortcut).toHaveAttribute('title', 'Open command menu')
  })

  it('renders children correctly', () => {
    const { container } = render(
      <CommandShortcut>
        <span>⌘</span>
        <span>+</span>
        <span>K</span>
      </CommandShortcut>
    )
    
    const shortcut = container.firstChild as HTMLElement
    expect(shortcut).toBeInTheDocument()
    expect(shortcut.textContent).toBe('⌘+K')
  })
})

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, ...props }: any) => (
    <div data-testid="mock-dialog" {...props}>
      {children}
    </div>
  ),
  DialogContent: ({ children, className }: any) => (
    <div data-testid="mock-dialog-content" className={className}>
      {children}
    </div>
  )
}))

describe('Command Components', () => {
  describe('CommandDialog', () => {
    it('renders dialog with correct structure', () => {
      const { getByTestId } = render(
        <CommandDialog open>
          <div>Test Content</div>
        </CommandDialog>
      )

      const dialog = getByTestId('mock-dialog')
      const dialogContent = getByTestId('mock-dialog-content')

      expect(dialog).toBeInTheDocument()
      expect(dialogContent).toHaveClass('overflow-hidden p-0 shadow-lg')
    })

    it('renders children within Command component', () => {
      const { getByText } = render(
        <CommandDialog>
          <div>Test Child Content</div>
        </CommandDialog>
      )

      expect(getByText('Test Child Content')).toBeInTheDocument()
    })
  })
})