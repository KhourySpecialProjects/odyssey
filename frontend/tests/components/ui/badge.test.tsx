import { render } from '@testing-library/react'
import { Badge } from '@/components/ui/badge'

describe('Badge', () => {
  it('renders with default variant', () => {
    const { container } = render(<Badge>Test Badge</Badge>)
    expect(container.firstChild).toHaveClass('bg-primary', 'text-white')
  })

  it('renders with secondary variant', () => {
    const { container } = render(<Badge variant="secondary">Secondary</Badge>)
    expect(container.firstChild).toHaveClass('bg-secondary')
  })

  it('renders with destructive variant', () => {
    const { container } = render(<Badge variant="destructive">Destructive</Badge>)
    expect(container.firstChild).toHaveClass('bg-destructive')
  })

  it('renders with outline variant', () => {
    const { container } = render(<Badge variant="outline">Outline</Badge>)
    expect(container.firstChild).toHaveClass('text-foreground')
  })

  it('applies additional className', () => {
    const { container } = render(<Badge className="test-class">Test</Badge>)
    expect(container.firstChild).toHaveClass('test-class')
  })
})