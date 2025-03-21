import { render, screen, waitFor } from '@testing-library/react'
import Loading from '@/app/(creation)/new/droplet/loading'
import CreateDropletRoute from '@/app/(creation)/new/droplet/page'
import { CreateDroplet } from '@/components/new/new-droplet'

// Mock the CreateDroplet component
jest.mock('@/components/new/new-droplet', () => ({
  CreateDroplet: () => <div data-testid="create-droplet">Mock CreateDroplet Component</div>
}))

describe('Droplet Creation Pages', () => {
  describe('Loading Component', () => {
    it('renders loading spinner', () => {
      render(<Loading />)
      expect(screen.getByRole('status')).toBeInTheDocument()
      expect(screen.getByRole('status')).toHaveClass('animate-spin')
    })
  })

  describe('CreateDropletRoute', () => {
    it('renders CreateDroplet component', () => {
      render(<CreateDropletRoute />)
      expect(screen.getByTestId('create-droplet')).toBeInTheDocument()
    })

    it('has correct container styling', async () => {
      const { container } = render(<CreateDropletRoute />)
      const mainElement = container.firstElementChild
      await waitFor(() => expect(mainElement).not.toBeNull());
      expect(mainElement).toHaveClass('relative', 'light:bg-slate-100', 'isolate')
    })
  })
}) 