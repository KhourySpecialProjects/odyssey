import { render, screen } from '@testing-library/react'
import Loading from '@/app/(creation)/new/droplet/loading'
import CreateDropletRoute from '@/app/(creation)/new/droplet/page'
import { CreateDroplet } from '@/components/new/new-droplet'

// Mock the CreateDroplet component
jest.mock('@/components/new/new-droplet', () => ({
  CreateDroplet: jest.fn(() => <div>Mock CreateDroplet Component</div>)
}))

describe('Droplet Creation Pages', () => {
  describe('Loading Component', () => {
    it('renders loading spinner', () => {
      render(<Loading />)
      expect(screen.getByRole('img')).toBeInTheDocument()
      expect(screen.getByRole('img')).toHaveClass('animate-spin')
    })
  })

  describe('CreateDropletRoute', () => {
    it('renders CreateDroplet component', () => {
      render(<CreateDropletRoute />)
      expect(screen.getByText('Mock CreateDroplet Component')).toBeInTheDocument()
    })

    it('has correct container styling', () => {
      const { container } = render(<CreateDropletRoute />)
      expect(container.firstChild).toHaveClass('relative', 'light:bg-slate-100', 'isolate')
    })
  })
}) 