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
    
    expect(screen.getByTestId('access-banner-title')).toHaveTextContent(/ready to join the odyssey/i);
    expect(screen.getByRole('link', { name: /request access/i })).toBeInTheDocument();
  })

  it('does not render banner for authenticated users', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { name: 'Test User' } })
    const { container } = await render(<AccessRequestBanner />)
    
    expect(container).toBeEmptyDOMElement()
  })

  it('renders with correct styling', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null)
    await render(<AccessRequestBanner />)
    
    const link = screen.getByRole('link', { name: /request access/i });
    expect(link).toHaveClass('dark:bg-slate-300');
  })
})