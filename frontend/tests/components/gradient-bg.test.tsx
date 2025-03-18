import { render, screen } from '@testing-library/react'
import { GradientBackground } from '@/components/gradient-bg'

describe('GradientBackground', () => {
  it('renders children', () => {
    render(
      <GradientBackground>
        <div>Test Content</div>
      </GradientBackground>
    )
    
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('applies default classes', () => {
    const { container } = render(
      <GradientBackground>
        <div>Test Content</div>
      </GradientBackground>
    )
    
    expect(container.firstChild).toHaveClass(
      'bg-white',
      'dark:bg-zinc-950',
      'isolate'
    )
  })

  it('applies additional classes from className prop', () => {
    const { container } = render(
      <GradientBackground className="test-class">
        <div>Test Content</div>
      </GradientBackground>
    )
    
    expect(container.firstChild).toHaveClass('test-class')
  })
})