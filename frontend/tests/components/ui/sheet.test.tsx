import { render, fireEvent } from '@testing-library/react'
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter
} from '@/components/ui/sheet'

describe('Sheet', () => {
  const TestSheet = () => (
    <Sheet>
      <SheetTrigger>Open</SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Test Title</SheetTitle>
          <SheetDescription>Test Description</SheetDescription>
        </SheetHeader>
        <div>Content</div>
        <SheetFooter>Footer</SheetFooter>
      </SheetContent>
    </Sheet>
  )

  it('renders trigger button', () => {
    const { getByText } = render(<TestSheet />)
    expect(getByText('Open')).toBeInTheDocument()
  })

  it('shows content when triggered', () => {
    const { getByText } = render(<TestSheet />)
    fireEvent.click(getByText('Open'))
    expect(getByText('Test Title')).toBeInTheDocument()
    expect(getByText('Test Description')).toBeInTheDocument()
  })

  it('applies correct side variant styling', () => {
    const { container } = render(
      <Sheet>
        <SheetContent side="left">Content</SheetContent>
      </Sheet>
    )
    expect(container.firstChild).toHaveClass('left-0')
  })
})