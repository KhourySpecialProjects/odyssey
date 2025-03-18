import { render, fireEvent, waitFor } from '@testing-library/react'
import { StarRating } from '@/components/ui/rating-stars'
import { changeEnrollmentRating, getEnrollByID } from '@/lib/requests/enrollment'

jest.mock('@/lib/requests/enrollment', () => ({
  changeEnrollmentRating: jest.fn(),
  getEnrollByID: jest.fn()
}))

describe('StarRating', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders correct number of stars', () => {
    const { container } = render(
      <StarRating value={3} enrollmentID="" average={true} />
    )
    expect(container.querySelectorAll('svg')).toHaveLength(5)
  })

  it('displays average rating correctly', () => {
    const { getByText } = render(
      <StarRating value={3.5} enrollmentID="" average={true} />
    )
    expect(getByText('3.5')).toBeInTheDocument()
  })

  it('handles rating click in interactive mode', async () => {
    const enrollmentID = '123'
    ;(changeEnrollmentRating as jest.Mock).mockResolvedValue({})
    
    const { container } = render(
      <StarRating value={0} enrollmentID={enrollmentID} average={false} />
    )

    const thirdStar = container.querySelectorAll('input')[2]
    fireEvent.click(thirdStar)

    await waitFor(() => {
      expect(changeEnrollmentRating).toHaveBeenCalledWith(3, enrollmentID)
    })
  })

  it('fetches initial rating on mount', async () => {
    const enrollmentID = '123'
    ;(getEnrollByID as jest.Mock).mockResolvedValue({ rating: 4 })

    render(<StarRating value={0} enrollmentID={enrollmentID} average={false} />)

    await waitFor(() => {
      expect(getEnrollByID).toHaveBeenCalledWith(enrollmentID)
    })
  })
})