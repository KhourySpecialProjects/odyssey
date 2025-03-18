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
    it('renders for unauthenticated users', async () => {
      ;(getCurrentUser as jest.Mock).mockResolvedValue(null)
      await render(<HomeRoute />)
      
      expect(screen.getByText('Reinforce Your Learning and Fuel Your Future')).toBeInTheDocument()
      expect(screen.getByText('Explore')).toBeInTheDocument()
      expect(screen.getByText('Request Access')).toBeInTheDocument()
    })

    it('renders for authenticated users', async () => {
      ;(getCurrentUser as jest.Mock).mockResolvedValue({ id: 1 })
      await render(<HomeRoute />)
      
      expect(screen.getByText('Reinforce Your Learning and Fuel Your Future')).toBeInTheDocument()
      expect(screen.getByText('Explore')).toBeInTheDocument()
      expect(screen.queryByText('Request Access')).not.toBeInTheDocument()
    })

    it('renders with correct styling', async () => {
      await render(<HomeRoute />)
      
      expect(screen.getByRole('heading')).toHaveClass('text-4xl', 'font-black')
      expect(screen.getByText('Explore')).toHaveClass('dark:bg-slate-800')
    })
  })

  describe('NotFoundRoute', () => {
    it('renders not found message', () => {
      render(<NotFoundRoute />)
      expect(screen.getByText('Page Not Found')).toBeInTheDocument()
      expect(screen.getByText('The requested resource does not exist, or you do not have access to it.')).toBeInTheDocument()
    })

    it('renders home page link', () => {
      render(<NotFoundRoute />)
      expect(screen.getByText('Return to Home Page')).toBeInTheDocument()
    })

    it('renders with correct styling', () => {
      render(<NotFoundRoute />)
      expect(screen.getByRole('button')).toHaveClass('size-lg')
    })
  })
}) 