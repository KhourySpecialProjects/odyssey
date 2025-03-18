import { render } from '@testing-library/react'
import { ThemeClientProvider } from '@/components/theme.client.provider'
import { ThemeProvider } from 'next-themes'

// Mock next-themes
jest.mock('next-themes', () => ({
  ThemeProvider: jest.fn(({ children }) => <div>{children}</div>)
}))

describe('ThemeClientProvider', () => {
  it('renders children', () => {
    render(
      <ThemeClientProvider>
        <div>Test Content</div>
      </ThemeClientProvider>
    )
    
    expect(ThemeProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        attribute: 'class',
        defaultTheme: 'system',
        enableSystem: true
      }),
      expect.any(Object)
    )
  })

  it('passes correct props to ThemeProvider', () => {
    render(
      <ThemeClientProvider>
        <div>Test Content</div>
      </ThemeClientProvider>
    )
    
    expect(ThemeProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        attribute: 'class',
        defaultTheme: 'system',
        enableSystem: true
      }),
      expect.any(Object)
    )
  })
})