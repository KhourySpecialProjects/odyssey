import { render } from '@testing-library/react'
import { ThemeClientProvider } from '@/components/theme.client.provider'
import { ThemeProvider } from 'next-themes'

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
      {
        attribute: 'class',
        defaultTheme: 'system',
        enableSystem: true,
        children: expect.any(Object)
      },
      undefined
    )
  })

  it('passes correct props to ThemeProvider', () => {
    render(
      <ThemeClientProvider>
        <div>Test Content</div>
      </ThemeClientProvider>
    )
    
    expect(ThemeProvider).toHaveBeenCalledWith(
      {
        attribute: 'class',
        defaultTheme: 'system',
        enableSystem: true,
        children: expect.any(Object)
      },
      undefined
    )
  })
})