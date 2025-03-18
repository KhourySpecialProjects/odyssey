import { render } from '@testing-library/react'
import { Toaster } from '@/components/ui/sonner'
import { useTheme } from 'next-themes'

jest.mock('next-themes', () => ({
  useTheme: jest.fn()
}))

describe('Toaster', () => {
  beforeEach(() => {
    (useTheme as jest.Mock).mockReturnValue({ theme: 'light' })
  })

  it('renders with default theme', () => {
    const { container } = render(<Toaster />)
    expect(container.firstChild).toHaveClass('toaster')
  })

  it('applies theme from next-themes', () => {
    (useTheme as jest.Mock).mockReturnValue({ theme: 'dark' })
    render(<Toaster />)
    expect(useTheme).toHaveBeenCalled()
  })

  it('passes custom props to Sonner', () => {
    const { container } = render(<Toaster position="top-right" />)
    expect(container.firstChild).toHaveAttribute('data-position', 'top-right')
  })
})