import { render, fireEvent, act } from '@testing-library/react'
import { FirstVisitPopup } from '@/components/first-time/first-visit-popup'
import { updateFirstTimeStatus, updateOnboardingInfo } from '@/lib/actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

jest.mock('@/lib/actions', () => ({
  updateFirstTimeStatus: jest.fn(),
  updateOnboardingInfo: jest.fn()
}))

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn()
  }
}))

jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}))

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => <img {...props} />
}))

describe('FirstVisitPopup', () => {
  const mockRouter = {
    push: jest.fn()
  }

  const mockUser = {
    id: '1',
    firstTime: true
  } as any

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
  })

  describe('form validation and submission', () => {
    it('shows error when trying to close without first name', async () => {
      const { getByText } = render(<FirstVisitPopup user={mockUser} />)
      
      await act(async () => {
        fireEvent.click(getByText('Start Exploring'))
      })

      expect(toast.error).toHaveBeenCalledWith('Please enter your first name before continuing')
      expect(updateFirstTimeStatus).not.toHaveBeenCalled()
    })

    it('shows error when trying to close without last name', async () => {
      const { getByText, getByLabelText } = render(<FirstVisitPopup user={mockUser} />)

      const firstNameInput = getByLabelText('First name')
      fireEvent.change(firstNameInput, {
        target: { value: 'John' }
      })

      await act(async () => {
        fireEvent.click(getByText('Start Exploring'))
      })

      expect(toast.error).toHaveBeenCalledWith('Please enter your last name before continuing')
      expect(updateFirstTimeStatus).not.toHaveBeenCalled()
    })

    it('successfully submits form with required fields', async () => {
      const { getByText, getByLabelText } = render(<FirstVisitPopup user={mockUser} />)
      
      const firstNameInput = getByLabelText('First name')
      const lastNameInput = getByLabelText('Last name')
      const bioInput = getByLabelText('Bio')

      fireEvent.change(firstNameInput, {
        target: { value: 'John' }
      })
      fireEvent.change(lastNameInput, {
        target: { value: 'Doe' }
      })
      fireEvent.change(bioInput, {
        target: { value: 'Test bio' }
      })

      await act(async () => {
        fireEvent.click(getByText('Start Exploring'))
      })

      expect(updateFirstTimeStatus).toHaveBeenCalledWith('1')
      expect(updateOnboardingInfo).toHaveBeenCalledWith('John', 'Doe', 'Test bio', '1')
      expect(mockRouter.push).toHaveBeenCalledWith('/d/introduction-to-odyssey')
    })
  })

  describe('dialog behavior', () => {
    it('prevents closing dialog without required fields', async () => {
      const { getByRole } = render(<FirstVisitPopup user={mockUser} />)

      const dialog = await getByRole('dialog', { hidden: true })
      
      await act(async () => {
        fireEvent.keyDown(dialog, { key: 'Escape' })
      })

      expect(toast.error).toHaveBeenCalledWith('Please enter your first name before continuing')
    })

    it('allows closing dialog with all required fields', async () => {
      const { getByRole, getByLabelText } = render(<FirstVisitPopup user={mockUser} />)
      
      const firstNameInput = getByLabelText('First name')
      const lastNameInput = getByLabelText('Last name')

      fireEvent.change(firstNameInput, {
        target: { value: 'John' }
      })
      fireEvent.change(lastNameInput, {
        target: { value: 'Doe' }
      })

      const dialog = await getByRole('dialog', { hidden: true })
      
      await act(async () => {
        fireEvent.keyDown(dialog, { key: 'Escape' })
      })

      expect(updateFirstTimeStatus).toHaveBeenCalled()
    })
  })
})