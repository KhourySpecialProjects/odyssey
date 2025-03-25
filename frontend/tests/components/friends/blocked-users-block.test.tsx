import { render, fireEvent, act } from '@testing-library/react'
import { BlockedUsersBlock } from '@/components/friends/blocked-users-block'
import { unblockUser } from '@/lib/requests/friends'
import { toast } from 'sonner'

jest.mock('@/lib/requests/friends', () => ({
  unblockUser: jest.fn()
}))

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  }
}))

describe('BlockedUsersBlock', () => {
  const mockUser = {
    id: '1'
  } as any

  const mockBlocked = {
    id: '2',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com'
  } as any

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('unblock functionality', () => {
    it('successfully unblocks user', async () => {
      ;(unblockUser as jest.Mock).mockResolvedValueOnce({ success: true })
      
      const { getByText } = render(
        <BlockedUsersBlock user={mockUser} blocked={mockBlocked} />
      )

      await act(async () => {
        fireEvent.click(getByText('Unblock'))
      })

      expect(unblockUser).toHaveBeenCalledWith('1', '2')
      expect(toast.success).toHaveBeenCalledWith('User unblocked')
    })

    it('handles unblock failure', async () => {
      ;(unblockUser as jest.Mock).mockResolvedValueOnce({ success: false })
      
      const { getByText } = render(
        <BlockedUsersBlock user={mockUser} blocked={mockBlocked} />
      )

      await act(async () => {
        fireEvent.click(getByText('Unblock'))
      })

      expect(unblockUser).toHaveBeenCalledWith('1', '2')
      expect(toast.error).toHaveBeenCalledWith('Failed to unblock user')
    })
  })
})