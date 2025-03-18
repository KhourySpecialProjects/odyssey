import { render } from '@testing-library/react'
import { CalloutIcon } from '@/components/ui/callout-icons'

describe('CalloutIcon', () => {
  it('renders warning icon for red color', () => {
    const { container } = render(<CalloutIcon color="bg-red-300" />)
    expect(container.querySelector('svg')).toHaveClass('text-black')
  })

  it('renders help icon for blue color', () => {
    const { container } = render(<CalloutIcon color="bg-blue-300" />)
    expect(container.querySelector('svg')).toHaveClass('text-black')
  })

  it('renders alert icon for orange color', () => {
    const { container } = render(<CalloutIcon color="bg-orange-300" />)
    expect(container.querySelector('svg')).toHaveClass('text-black')
  })

  it('renders empty div for unknown color', () => {
    const { container } = render(<CalloutIcon color="bg-unknown-300" />)
    expect(container.firstChild).toBeEmptyDOMElement()
  })
})