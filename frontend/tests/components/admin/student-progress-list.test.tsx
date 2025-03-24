import { render, screen, fireEvent } from '@testing-library/react'
import { StudentProgressList } from '@/components/admin/progress/student-progress-list'

jest.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}))

describe('StudentProgressList', () => {
  const mockPlaylists = [
    {
      id: 1,
      name: 'Test Playlist 1',
      slug: 'test-playlist-1',
      authorized_users: [
        { id: 1, email: 'student1@test.com', progress: 50 },
        { id: 2, email: 'student2@test.com', progress: 75 }
      ]
    },
    {
      id: 2,
      name: 'Test Playlist 2',
      slug: 'test-playlist-2',
      authorized_users: [
        { id: 3, email: 'student3@test.com', progress: 25 }
      ]
    }
  ]

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()

    // Mock URL APIs
    global.URL.createObjectURL = jest.fn(() => 'mock-url')
    global.URL.revokeObjectURL = jest.fn()

    // Mock Blob
    global.Blob = jest.fn().mockImplementation((content, options) => ({
      content,
      options,
    })) as any

    // Setup document.body
    document.body.innerHTML = '<div id="root"></div>'
  })

  it('renders empty state when no playlists are provided', () => {
    render(<StudentProgressList playlists={[]} />)
    expect(screen.getByText("You haven't created any private playlists yet")).toBeInTheDocument()
  })

  it('renders playlist cards with correct information', () => {
    render(<StudentProgressList playlists={mockPlaylists} />)
    
    // Check playlist names
    expect(screen.getByText('Test Playlist 1')).toBeInTheDocument()
    expect(screen.getByText('Test Playlist 2')).toBeInTheDocument()
    
    // Check student counts
    expect(screen.getByText('2 enrolled students')).toBeInTheDocument()
    expect(screen.getByText('1 enrolled student')).toBeInTheDocument()
  })

  it('toggles playlist content visibility when clicked', () => {
    render(<StudentProgressList playlists={mockPlaylists} />)
    
    // Initially, student emails should not be visible
    expect(screen.queryByText('student1@test.com')).not.toBeInTheDocument()
    
    // Click to expand first playlist
    fireEvent.click(screen.getByText('Test Playlist 1'))
    
    // Student information should now be visible
    expect(screen.getByText('student1@test.com')).toBeInTheDocument()
    expect(screen.getByText('student2@test.com')).toBeInTheDocument()
    
    // Click again to collapse
    fireEvent.click(screen.getByText('Test Playlist 1'))
    
    // Student information should be hidden again
    expect(screen.queryByText('student1@test.com')).not.toBeInTheDocument()
  })
  
})