import { render } from '@testing-library/react'
import { Skeleton } from '@/components/ui/skeleton'

describe('Skeleton', () => {
  it('renders with default styling', () => {
    const { container } = render(<Skeleton />)
    expect(container.firstChild).toHaveClass('animate-pulse', 'rounded-md')
  })

  it('applies custom className', () => {
    const { container } = render(<Skeleton className="h-10 w-20" />)
    expect(container.firstChild).toHaveClass('h-10', 'w-20')
  })

  it('renders with dark mode styling', () => {
    const { container } = render(<Skeleton />)
    expect(container.firstChild).toHaveClass('dark:bg-slate-800')
  })
})