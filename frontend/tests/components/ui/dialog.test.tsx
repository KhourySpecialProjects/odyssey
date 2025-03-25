import { render, screen, fireEvent } from '@testing-library/react'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

describe('Dialog', () => {
  const TestDialog = () => (
    <Dialog>
      <DialogTrigger>Open</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Test Title</DialogTitle>
          <DialogDescription>Test Description</DialogDescription>
        </DialogHeader>
        <div>Content</div>
        <DialogFooter>Footer</DialogFooter>
      </DialogContent>
    </Dialog>
  )

  it('renders trigger button', () => {
    render(<TestDialog />)
    expect(screen.getByText('Open')).toBeInTheDocument()
  })

  it('shows dialog content when triggered', () => {
    render(<TestDialog />)
    fireEvent.click(screen.getByText('Open'))
    expect(screen.getByText('Test Title')).toBeInTheDocument()
    expect(screen.getByText('Test Description')).toBeInTheDocument()
  })

  it('applies correct styling to content', () => {
    render(<TestDialog />)
    fireEvent.click(screen.getByText('Open'))
    expect(screen.getByRole('dialog')).toHaveClass('fixed', 'z-50')
  })

  it('renders DialogDescription with custom className', () => {
    const { container } = render(
      <Dialog>
        <DialogDescription className="custom-class">
          Description text
        </DialogDescription>
      </Dialog>
    );

    expect(container.firstChild).toHaveClass('custom-class');
    expect(container.firstChild).toHaveClass('text-slate-500');
    expect(container.firstChild).toHaveTextContent('Description text');
  });
})