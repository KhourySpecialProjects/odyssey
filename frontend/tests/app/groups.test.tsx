import { render, screen } from '@testing-library/react'
import GroupDetailPage from '@/app/(groups)/g/[slug]/page'
import { getCurrentUser } from '@/lib/auth/session'
import { getAuthorizedUserByEmail } from '@/lib/requests/authorized-user'
import { getGroupBySlugV2, getGroupDueDates } from '@/lib/requests/groups'
import { isAuthorizedUserAdmin } from '@/lib/utils'

// Mock all the required functions
jest.mock('@/lib/auth/session', () => ({
  getCurrentUser: jest.fn()
}))

jest.mock('@/lib/requests/authorized-user', () => ({
  getAuthorizedUserByEmail: jest.fn()
}))

jest.mock('@/lib/requests/groups', () => ({
  getGroupBySlugV2: jest.fn(),
  getGroupDueDates: jest.fn(),
  getGroupBySlug: jest.fn(),
}))

jest.mock('@/lib/utils', () => ({
  isAuthorizedUserAdmin: jest.fn()
}))

describe('Group Detail Page', () => {
  const mockUser = {
    email: 'test@example.com',
    roles: ['user']
  }

  const mockAuthUser = {
    id: 1,
    email: 'test@example.com'
  }

  const mockGroup = {
    id: 1,
    slug: 'test-group',
    creator: { id: 1, name: 'Test Creator' },
    admins: [{ id: 2, name: 'Test Admin' }],
    managers: [{ id: 3, name: 'Test Manager' }],
    members: [{ id: 1 }, { id: 2 }, { id: 3 }],
    semester: 'Spring 2024',
    description: 'Test group description'
  }

  const mockDueDates = [
    {
      droplet: { id: 1 },
      dueDate: '2024-04-01'
    }
  ]

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
   
    (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
    (getAuthorizedUserByEmail as jest.Mock).mockResolvedValue(mockAuthUser);
    (getGroupBySlugV2 as jest.Mock).mockResolvedValue(mockGroup);
    (getGroupDueDates as jest.Mock).mockResolvedValue(mockDueDates);
    (isAuthorizedUserAdmin as jest.Mock).mockReturnValue(false);
  });

  it('handles missing user data', async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue(null);
    
    const { container } = await render(
      <GroupDetailPage params={Promise.resolve({ slug: 'test-group' })} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('hides edit controls for regular members', async () => {
    const regularMemberAuthUser = { ...mockAuthUser, id: 999 };
    (getAuthorizedUserByEmail as jest.Mock).mockResolvedValue(regularMemberAuthUser);
    
    await render(
      <GroupDetailPage params={Promise.resolve({ slug: 'test-group' })} />
    );
    
    expect(screen.queryByTestId('group-edit-controls')).not.toBeInTheDocument();
  });

}); 