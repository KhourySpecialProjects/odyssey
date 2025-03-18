import { render } from '@testing-library/react'
import { Label } from '@/components/ui/label'

describe('Label', () => {
  it('renders label text', () => {
    const { getByText } = render(<Label>Test Label</Label>)
    expect(getByText('Test Label')).toBeInTheDocument()
  })

  it('applies default styling', () => {
    const { container } = render(<Label>Test Label</Label>)
    expect(container.firstChild).toHaveClass('text-sm', 'font-medium')
  })

  it('applies custom className', () => {
    const { container } = render(<Label className="test-class">Test Label</Label>)
    expect(container.firstChild).toHaveClass('test-class')
  })

  it('applies disabled styling when peer is disabled', () => {
    const { container } = render(<Label>Test Label</Label>)
    expect(container.firstChild).toHaveClass('peer-disabled:cursor-not-allowed')
  })
})