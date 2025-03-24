import { render, screen, fireEvent } from '@testing-library/react';
import { GroupDashboard } from '@/components/group/group-management-dashboard';
import { AuthorizedUserRoleTitle } from '@/lib/globals';
import { DropletStatus, DropletType, FocusArea, GroupSemester, Tag, TimeZone } from '@/types';
import { DateTime } from 'luxon';

describe('GroupDashboard', () => {
  const mockGroup = {
    id: 1,
    groupName: 'Test Group',
    slug: 'test-group',
    isArchived: false,
    semester: "SPRING" as GroupSemester
  };

  const mockAuthUser = {
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
    timeZone: "America/New_York" as TimeZone
  };
  const mockDroplet = {
    id: 1,
    name: 'Test Droplet',
    slug: 'test-droplet',
    isHidden: false,
    focusArea: 'personal' as FocusArea,
    type: 'knowledge' as DropletType,
    tags: [{ id: 1, name: 'React' }] as Tag[],
    learningObjectives: [],
    status: "published" as DropletStatus,
    droplet_lessons: []
  };
  const mockDueDates = [
    { 
      id: 1,
      droplet: mockDroplet,
      dueDate: DateTime.local().plus({ days: 1 }).toISO(),
      authorized_user: 1,
      group: mockGroup
    }
  ];

  it('renders tabs correctly', () => {
    render(
      <GroupDashboard 
        group={mockGroup}
        canEdit={true}
        authUser={mockAuthUser}
        dueDates={mockDueDates}
      />
    );
    expect(screen.getByText('Droplets')).toBeInTheDocument();
    expect(screen.getByText('Playlists')).toBeInTheDocument();
    expect(screen.getByText('Progress')).toBeInTheDocument();
  });

});