import { render, fireEvent } from '@testing-library/react'
import { Textarea } from '@/components/ui/textarea'

describe('Textarea', () => {
  it('renders textarea element', () => {
    const { container } = render(<Textarea />)
    expect(container.querySelector('textarea')).toBeInTheDocument()
  })

  it('handles value changes', () => {
    const handleChange = jest.fn()
    const { container } = render(<Textarea onChange={handleChange} />)
    fireEvent.change(container.querySelector('textarea')!, {
      target: { value: 'test' }
    })
    expect(handleChange).toHaveBeenCalled()
  })

  it('applies default styling', () => {
    const { container } = render(<Textarea />)
    expect(container.firstChild).toHaveClass(
      'flex',
      'min-h-[80px]',
      'w-full',
      'rounded-md'
    )
  })

  it('applies disabled styling', () => {
    const { container } = render(<Textarea disabled />)
    expect(container.firstChild).toHaveClass('disabled:cursor-not-allowed')
  })

  it('applies custom className', () => {
    const { container } = render(<Textarea className="test-class" />)
    expect(container.firstChild).toHaveClass('test-class')
  })
})