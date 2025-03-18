import { render, screen } from '@testing-library/react'
import AccessRequestBanner from '@/components/access-request-banner'
import { getServerSession } from 'next-auth'

// Mock next-auth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn()
}))

describe('AccessRequestBanner', () => {
  it('renders banner for unauthenticated users', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null)
    await render(<AccessRequestBanner />)
    
    expect(screen.getByText('Ready to join the Odyssey?')).toBeInTheDocument()
    expect(screen.getByText('Request Access')).toBeInTheDocument()
  })

  it('does not render banner for authenticated users', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { name: 'Test User' } })
    const { container } = await render(<AccessRequestBanner />)
    
    expect(container).toBeEmptyDOMElement()
  })

  it('renders with correct styling', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null)
    await render(<AccessRequestBanner />)
    
    expect(screen.getByRole('link')).toHaveClass('dark:bg-slate-300')
  })
})