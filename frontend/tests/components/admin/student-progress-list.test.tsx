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
    jest.clearAllMocks()

    global.URL.createObjectURL = jest.fn()
    global.URL.revokeObjectURL = jest.fn()

    global.Blob = jest.fn().mockImplementation((content, options) => ({
      content,
      options,
    })) as any

    document.body.innerHTML = '<div id="root"></div>'
  })

  it('renders empty state when no playlists are provided', () => {
    render(<StudentProgressList playlists={[]} />)
    expect(screen.getByText("You haven't created any private playlists yet")).toBeInTheDocument()
  })

  it('renders playlist cards with correct information', () => {
    render(<StudentProgressList playlists={mockPlaylists} />)

    expect(screen.getByText('Test Playlist 1')).toBeInTheDocument()
    expect(screen.getByText('Test Playlist 2')).toBeInTheDocument()

    expect(screen.getByText('2 enrolled students')).toBeInTheDocument()
    expect(screen.getByText('1 enrolled student')).toBeInTheDocument()
  })

  it('toggles playlist content visibility when clicked', () => {
    render(<StudentProgressList playlists={mockPlaylists} />)
 
    expect(screen.queryByText('student1@test.com')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('Test Playlist 1'))
 
    expect(screen.getByText('student1@test.com')).toBeInTheDocument()
    expect(screen.getByText('student2@test.com')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Test Playlist 1'))

    expect(screen.queryByText('student1@test.com')).not.toBeInTheDocument()
  })

  it('exports progress data as CSV correctly', async () => {
    render(<StudentProgressList playlists={mockPlaylists} />);
    
    fireEvent.click(screen.getByText('Test Playlist 1'));

    const exportButton = screen.getByText('Export Progress as CSV');
    fireEvent.click(exportButton);

    const expectedCSVContent = 'email,progress\nstudent1@test.com,0.50\nstudent2@test.com,0.75';
    expect(global.URL.createObjectURL).toHaveBeenCalledWith(
      expect.objectContaining({
        content: [expectedCSVContent],
        options: {
          type: 'text/csv;charset=utf-8;'
        }
      })
    );
  });

  it('displays message when no playlists exist', () => {
    render(<StudentProgressList playlists={[]} />);
    
    expect(screen.getByText("You haven't created any private playlists yet")).toBeInTheDocument();
  });
  
})