import { render, fireEvent, act, getByRole, screen } from '@testing-library/react'
import { FriendRequestFeedBlock } from '@/components/friends/friend-request-feed-block'
import { BlockUser, acceptFriendRequest, rejectFriendRequest, removeFriend } from '@/lib/requests/friends'
import { toast } from 'sonner'
import { AuthorizedUserRoleTitle } from '@/lib/globals'
import { AuthorizedUserRole, TimeZone } from '@/types'

jest.mock('@/lib/requests/friends', () => ({
  BlockUser: jest.fn(),
  acceptFriendRequest: jest.fn(),
  rejectFriendRequest: jest.fn(),
  removeFriend: jest.fn()
}))

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  }
}))

describe('FriendRequestFeedBlock', () => {
  const mockUser = {
    id: 1,
    email: 'user@example.com',
    firstName: 'John',
    lastName: 'Doe',
    bio: 'Test bio',
    profilePhoto: 'https://example.com/photo.jpg',
    isEnabled: true,
    roles: [
      { id: 1, title: AuthorizedUserRoleTitle.Faculty }
    ],
    linkedin: "https://www.google.com/",
    github: "https://www.google.com/",
    firstTime: false,
    friendships: [],
    sent_requests: [],
    received_requests: [],
    blocked: [],
    was_blocked: [],
    timeZone: "America/New_York" as TimeZone,
    isActive: true
  } 

  const mockRequest = {
    id: 2,
    email: 'user@example.com',
    firstName: 'John',
    lastName: 'Doe',
    bio: 'Test bio',
    profilePhoto: 'https://example.com/photo.jpg',
    isEnabled: true,
    roles: [
      { id: 1, title: AuthorizedUserRoleTitle.Faculty }
    ],
    linkedin: "https://www.google.com/",
    github: "https://www.google.com/",
    firstTime: false,
    friendships: [],
    sent_requests: [],
    received_requests: [],
    blocked: [],
    was_blocked: [],
    timeZone: "America/New_York" as TimeZone,
    isActive: true
  } 

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('friend request actions', () => {
    it('accepts friend request successfully', async () => {
      ;(acceptFriendRequest as jest.Mock).mockResolvedValueOnce({ success: true })

      const { getByTitle } = render(
        <FriendRequestFeedBlock user={mockUser} request={mockRequest} />
      )

      await act(async () => {
        fireEvent.click(screen.getByRole('accept'))
      })

      expect(acceptFriendRequest).toHaveBeenCalledWith(1, 2)
      expect(toast.success).toHaveBeenCalledWith('Friend request accepted!')
    })

    it('rejects friend request successfully', async () => {
      ;(rejectFriendRequest as jest.Mock).mockResolvedValueOnce({ success: true })

      const { getByTitle } = render(
        <FriendRequestFeedBlock user={mockUser} request={mockRequest} />
      )

      await act(async () => {
        fireEvent.click(screen.getByRole('reject'))
      })

      expect(rejectFriendRequest).toHaveBeenCalledWith(1, 2)
      expect(toast.success).toHaveBeenCalledWith('Friend request rejected')
    })
  })
})