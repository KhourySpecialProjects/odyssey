import { render } from '@testing-library/react'
import AccessRequestBanner from '@/components/access-request-banner'
import { getServerSession } from 'next-auth'

jest.mock('next-auth', () => ({
  getServerSession: jest.fn()
}))

describe('AccessRequestBanner', () => {
  it('does not render banner for authenticated users', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { name: 'Test User' } })
    const { container } = await render(<AccessRequestBanner />)
    
    expect(container).toBeEmptyDOMElement()
  })
})