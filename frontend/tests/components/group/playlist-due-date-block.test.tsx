import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PlaylistDueDateBlock } from '@/components/group/playlist-due-date-block';
import { assignPlaylistDueDate, getGroupDueDate } from '@/lib/requests/groups';
import { GroupSemester } from '@/types';

jest.mock('@/lib/requests/groups', () => ({
  assignPlaylistDueDate: jest.fn(),
  getGroupDueDate: jest.fn(),
}));

describe('PlaylistDueDateBlock', () => {
  const mockGroup = {
    id: 1,
    groupName: 'Test Group',
    slug: 'test-group',
    isArchived: false,
    semester: "SPRING" as GroupSemester
  };
  const mockPlaylist = {
    id: 1,
    name: "Test Playlist",
    slug: "test-playlist",
    isPublic: false,
    droplets: [],
    authors: [],
    duration: "short" as "short" | "medium" | "long",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getGroupDueDate as jest.Mock).mockResolvedValue({ dueDate: null });
  });

  it('renders playlist name', () => {
    render(<PlaylistDueDateBlock existingGroup={mockGroup} currentPlaylist={mockPlaylist} />);
    expect(screen.getByText('Test Playlist')).toBeInTheDocument();
  });

  test('fetches and sets due date on mount', async () => {
    const mockDueDate = '2024-03-20T15:00:00.000Z';
    (getGroupDueDate as jest.Mock).mockResolvedValue({ dueDate: mockDueDate });

    render(
      <PlaylistDueDateBlock 
        existingGroup={mockGroup} 
        currentPlaylist={mockPlaylist} 
      />
    );

    await waitFor(() => {
      expect(getGroupDueDate).toHaveBeenCalledWith(mockPlaylist, mockGroup);
    });
  });
});