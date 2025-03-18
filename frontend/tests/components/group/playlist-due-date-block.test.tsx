import { render, screen, fireEvent } from '@testing-library/react';
import { PlaylistDueDateBlock } from '@/components/group/playlist-due-date-block';
import { assignPlaylistDueDate, getGroupDueDate } from '@/lib/requests/groups';
import { DateTime } from 'luxon';
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

  it('handles saving due date', async () => {
    render(<PlaylistDueDateBlock existingGroup={mockGroup} currentPlaylist={mockPlaylist} />);
    
    const date = DateTime.local();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: date.toISO() } });
    fireEvent.click(screen.getByText('Save'));

    expect(assignPlaylistDueDate).toHaveBeenCalledWith(
      expect.any(String),
      mockGroup,
      mockPlaylist
    );
  });
});