import { render, fireEvent, act, getByRole, screen } from '@testing-library/react'
import { FriendRequestBlock } from '@/components/friends/friend-request-block'
import { acceptFriendRequest, rejectFriendRequest } from '@/lib/requests/friends'
import { toast } from 'sonner'

// Mock the dependencies
jest.mock('@/lib/requests/friends', () => ({
  acceptFriendRequest: jest.fn(),
  rejectFriendRequest: jest.fn()
}))

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  }
}))

describe('FriendRequestBlock', () => {
  const mockUser = {
    id: '1',
    friendships: [
      { authorized_users: ['2'] }
    ]
  } as any

  const mockRequest = {
    id: '2',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com'
  } as any

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('handleApprove', () => {
    it('rejects if friendship already exists', async () => {
      const { getByTitle } = render(
        <FriendRequestBlock user={mockUser} request={mockRequest} />
      )

      await act(async () => {
        fireEvent.click(screen.getByRole('accept'))
      })

      expect(rejectFriendRequest).toHaveBeenCalledWith('1', '2')
      expect(toast.error).toHaveBeenCalledWith('Friendship already exists with this user')
    })

  })

  describe('handleReject', () => {
    it('rejects friend request successfully', async () => {
      ;(rejectFriendRequest as jest.Mock).mockResolvedValueOnce({ success: true })

      const { getByTitle } = render(
        <FriendRequestBlock user={mockUser} request={mockRequest} />
      )

      await act(async () => {
        fireEvent.click(screen.getByRole('reject'))
      })

      expect(rejectFriendRequest).toHaveBeenCalledWith('1', '2')
      expect(toast.success).toHaveBeenCalledWith('Friend request rejected')
    })
  })
})