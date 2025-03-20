import { render, screen } from '@testing-library/react'
import PlaylistPage from '@/app/(playlists)/p/[slug]/page'
import { getPlaylistBySlug } from '@/lib/requests/playlist'
import { getCurrentUser } from '@/lib/auth/session'
import { getAuthorizedUserByEmail } from '@/lib/requests/authorized-user'
import { getEnrollmentsByAuthorizedUser } from '@/lib/requests/enrollment'

// Mock all the required functions
jest.mock('@/lib/requests/playlist', () => ({
  getPlaylistBySlug: jest.fn()
}))

jest.mock('@/lib/auth/session', () => ({
  getCurrentUser: jest.fn()
}))

jest.mock('@/lib/requests/authorized-user', () => ({
  getAuthorizedUserByEmail: jest.fn()
}))

jest.mock('@/lib/requests/enrollment', () => ({
  getEnrollmentsByAuthorizedUser: jest.fn()
}))

global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  })
) as jest.Mock

describe('Playlist Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const mockUser = {
    email: 'test@example.com'
  }

  const mockAuthUser = {
    id: 1,
    email: 'test@example.com'
  }

  const mockPlaylist = {
    id: 1,
    name: 'Test Playlist',
    slug: 'test-playlist',
    duration: '2 hours',
    isPublic: true,
    description: 'Test playlist description',
    droplets: [
      {
        id: 1,
        name: 'Droplet 1',
        lessons: [{ id: 1, name: 'Lesson 1', slug: 'lesson-1' }]
      },
      {
        id: 2,
        name: 'Droplet 2',
        lessons: [{ id: 2, name: 'Lesson 2', slug: 'lesson-2' }]
      }
    ],
    authorized_users: [{ id: 1 }]
  }

  const mockEnrollments = [
    {
      droplet: { id: 1 },
      viewedLessons: [{ id: 1 }]
    }
  ]

  beforeEach(() => {
    ;(getCurrentUser as jest.Mock).mockResolvedValue(mockUser)
    ;(getAuthorizedUserByEmail as jest.Mock).mockResolvedValue(mockAuthUser)
    ;(getPlaylistBySlug as jest.Mock).mockResolvedValue(mockPlaylist)
    ;(getEnrollmentsByAuthorizedUser as jest.Mock).mockResolvedValue(mockEnrollments)
  })

  it('renders playlist details', async () => {
    await render(<PlaylistPage params={Promise.resolve({ slug: 'test-playlist' })} />)
    
    expect(screen.getByText('Test Playlist')).toBeInTheDocument()
    expect(screen.getByText('2 hours')).toBeInTheDocument()
    expect(screen.getByText('2 Lessons')).toBeInTheDocument()
    expect(screen.getByText('Test playlist description')).toBeInTheDocument()
  })

  it('renders progress bar for enrolled users', async () => {
    await render(<PlaylistPage params={Promise.resolve({ slug: 'test-playlist' })} />)
    
    expect(screen.getByText(/50/i)).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('renders droplet sections', async () => {
    await render(<PlaylistPage params={Promise.resolve({ slug: 'test-playlist' })} />)
    
    expect(screen.getByText(/where you left off/i)).toBeInTheDocument()
    expect(screen.getByText('Start Something New')).toBeInTheDocument()
    expect(screen.getByText('Completed Droplets')).toBeInTheDocument()
  })

  it('handles private playlists', async () => {
    const privatePlaylist = { ...mockPlaylist, isPublic: false }
    ;(getPlaylistBySlug as jest.Mock).mockResolvedValue(privatePlaylist)
    
    await render(<PlaylistPage params={Promise.resolve({ slug: 'test-playlist' })} />)
    expect(screen.getByText('Private')).toBeInTheDocument()
  })

  it('handles missing playlist data', async () => {
    ;(getPlaylistBySlug as jest.Mock).mockResolvedValue(null)
    
    await expect(
      render(<PlaylistPage params={Promise.resolve({ slug: 'non-existent' })} />)
    ).rejects.toThrow()
  })

  it('handles missing user data', async () => {
    ;(getCurrentUser as jest.Mock).mockResolvedValue(null)
    
    await render(<PlaylistPage params={Promise.resolve({ slug: 'test-playlist' })} />)
    expect(screen.queryByText('50% Complete')).not.toBeInTheDocument()
  })
}) 