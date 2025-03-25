import { render, screen } from '@testing-library/react'
import PlaylistPage from '@/app/(playlists)/p/[slug]/page'
import { getPlaylistBySlug } from '@/lib/requests/playlist'
import { getCurrentUser } from '@/lib/auth/session'
import { getAuthorizedUserByEmail } from '@/lib/requests/authorized-user'
import { getEnrollmentsByAuthorizedUser } from '@/lib/requests/enrollment'
import { notFound } from 'next/navigation'

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

  const mockPlaylist2 = {
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
    authorized_users: [{ id: 5 }]
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

  it('handles missing user data', async () => {
    ;(getCurrentUser as jest.Mock).mockResolvedValue(null)
    
    await render(<PlaylistPage params={Promise.resolve({ slug: 'test-playlist' })} />)
    expect(screen.queryByText(/complete/i)).not.toBeInTheDocument()
  })
}) 

jest.mock('@/lib/requests/playlist');
jest.mock('@/lib/auth/session');
jest.mock('@/lib/requests/authorized-user');
jest.mock('@/lib/requests/enrollment');
jest.mock('next/navigation', () => ({
  notFound: jest.fn()
}));

describe('PlaylistPage', () => {
  const mockPlaylist = {
    id: 1,
    name: 'Test Playlist',
    slug: 'test-playlist',
    isPublic: true,
    duration: 'short',
    droplets: [
      {
        id: 1,
        name: 'Droplet 1',
        lessons: [{ id: 1, name: 'Lesson 1', slug: 'lesson-1' }],
      },
      {
        id: 2,
        name: 'Droplet 2',
        lessons: [{ id: 2, name: 'Lesson 2', slug: 'lesson-2' }],
      },
    ],
    authorized_users: [{ id: 1, email: 'test@example.com' }],
  };

  const mockPlaylist2 = {
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
    authorized_users: [{ id: 5 }]
  }

  const mockUser = {
    email: 'test@example.com',
  };

  const mockAuthorizedUser = {
    id: 1,
    email: 'test@example.com',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getPlaylistBySlug as jest.Mock).mockResolvedValue(mockPlaylist);
    (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
    (getAuthorizedUserByEmail as jest.Mock).mockResolvedValue(mockAuthorizedUser);
    (getEnrollmentsByAuthorizedUser as jest.Mock).mockResolvedValue([
      {
        droplet: { id: 1 },
        viewedLessons: [{ id: 1 }],
      },
    ]);
  });

  it('handles private playlists correctly', async () => {
    const privatePlaylist = {
      ...mockPlaylist,
      isPublic: false,
    };
    (getPlaylistBySlug as jest.Mock).mockResolvedValue(privatePlaylist);

    await render(
      <PlaylistPage params={Promise.resolve({ slug: 'test-playlist' })} />
    );

    expect(screen.queryByText('Public')).not.toBeInTheDocument();
  });

  it('handles if user is not author', async () => {
    const privatePlaylist = {
      ...mockPlaylist2,
      isPublic: false,
    };
    (getPlaylistBySlug as jest.Mock).mockResolvedValue(privatePlaylist);

    await render(
      <PlaylistPage params={Promise.resolve({ slug: 'test-playlist' })} />
    );

    expect(screen.queryByText('Edit Playlist')).not.toBeInTheDocument();
  });

it('does not call notFound for public playlists when user is not enrolled', async () => {
  const publicPlaylist = {
    ...mockPlaylist,
    isPublic: true,
    authorized_users: [{ id: 999 }], 
  };
  
  (getPlaylistBySlug as jest.Mock).mockResolvedValue(publicPlaylist);
  (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
  (getAuthorizedUserByEmail as jest.Mock).mockResolvedValue(mockAuthorizedUser);
  (getEnrollmentsByAuthorizedUser as jest.Mock).mockResolvedValue([]);
  
  await render(
    <PlaylistPage params={Promise.resolve({ slug: 'test-playlist' })} />
  );

  expect(notFound).not.toHaveBeenCalled();
});

it('does not call notFound for private playlists when user is enrolled', async () => {
  const privateEnrolledPlaylist = {
    ...mockPlaylist,
    isPublic: false,
    authorized_users: [{ id: 1 }], 
  };
  
  (getPlaylistBySlug as jest.Mock).mockResolvedValue(privateEnrolledPlaylist);
  (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
  (getAuthorizedUserByEmail as jest.Mock).mockResolvedValue(mockAuthorizedUser);
  (getEnrollmentsByAuthorizedUser as jest.Mock).mockResolvedValue([]);
  
  await render(
    <PlaylistPage params={Promise.resolve({ slug: 'test-playlist' })} />
  );

  expect(notFound).not.toHaveBeenCalled();
});
})
