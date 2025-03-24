import { render, screen, fireEvent } from '@testing-library/react'
import Error from '@/app/(droplets)/d/[slug]/[lessonSlug]/error'
import Layout from '@/app/(droplets)/d/[slug]/[lessonSlug]/layout'
import Page from '@/app/(droplets)/d/[slug]/[lessonSlug]/page'
import { Confetti } from '@/app/(droplets)/d/[slug]/recap/confetti'
import NotFound from '@/app/(droplets)/d/[slug]/not-found'
import Loading from '@/app/(droplets)/d/loading'

// Mock the DropletLessonWrapper component
jest.mock('@/components/droplets/lessons/droplet-lesson-wrapper', () => ({
  DropletLessonWrapper: jest.fn(() => <div>Mock DropletLessonWrapper Component</div>)
}))

// Mock the getDropletBySlug function
jest.mock('@/lib/requests/droplet', () => ({
  getDropletBySlug: jest.fn().mockResolvedValue({
    id: 1,
    slug: 'test-droplet',
    droplet_lessons: []
  })
}))

describe('Droplet Lesson Pages', () => {
  describe('Error Component', () => {
    const mockError: Error & { digest?: string } = {
      name: 'Error',
      message: 'Test error',
      stack: undefined
    }
    const mockReset = jest.fn()

    it('renders error message', () => {
      render(<Error error={mockError} reset={mockReset} />)
      expect(screen.getByText('Something went wrong!')).toBeInTheDocument()
    })

    it('handles reset button click', () => {
      render(<Error error={mockError} reset={mockReset} />)
      fireEvent.click(screen.getByText('Try again'))
      expect(mockReset).toHaveBeenCalled()
    })

    it('renders home page link', () => {
      render(<Error error={mockError} reset={mockReset} />)
      expect(screen.getByText('Return to Home Page')).toBeInTheDocument()
    })
  })

  describe('Layout Component', () => {
    const mockParams = {
      slug: 'test-droplet',
      lessonSlug: 'test-lesson'
    }
  })

  describe('Confetti Component', () => {
    it('renders nothing', () => {
      const { container } = render(<Confetti />)
      expect(container).toBeEmptyDOMElement()
    })
  })

  describe('NotFound Component', () => {
    it('renders not found message', () => {
      render(<NotFound />)
      expect(screen.getByText('Page Not Found')).toBeInTheDocument()
      expect(screen.getByText('The requested lesson does not exist.')).toBeInTheDocument()
    })

    it('renders home page link', () => {
      render(<NotFound />)
      expect(screen.getByText('Return to Home Page')).toBeInTheDocument()
    })
  })
}) 