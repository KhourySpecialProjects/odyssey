import { render, screen } from '@testing-library/react'
import HomeRoute from '@/app/(general)/page'
import NotFoundRoute from '@/app/(general)/not-found'
import { getCurrentUser } from '@/lib/auth/session'

// Mock the getCurrentUser function
jest.mock('@/lib/auth/session', () => ({
  getCurrentUser: jest.fn()
}))

describe('General Pages', () => {
  describe('HomeRoute', () => {

    it('renders for authenticated users', async () => {
      ;(getCurrentUser as jest.Mock).mockResolvedValue({ id: 1 })
      await render(<HomeRoute />)
      
      expect(screen.queryByText('Request Access')).not.toBeInTheDocument()
    })

  })

  describe('NotFoundRoute', () => {
    it('renders not found message', () => {
      render(<NotFoundRoute />)
      expect(screen.getByText('The requested resource does not exist, or you do not have access to it.')).toBeInTheDocument()
    })

    it('renders home page link', () => {
      render(<NotFoundRoute />)
      expect(screen.getByText('Return to Home Page')).toBeInTheDocument()
    })
  })
}) 