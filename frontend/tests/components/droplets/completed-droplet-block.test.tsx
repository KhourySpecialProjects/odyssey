import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CompletedDropletBlock } from '@/components/droplets/completed-droplet-block';
import { updateEnrollmentFirstTime } from '@/lib/actions';
import { createFriendAnnouncement } from '@/lib/requests/feed';

jest.mock('@/lib/actions', () => ({
  updateEnrollmentFirstTime: jest.fn()
}));

jest.mock('@/lib/requests/feed', () => ({
  createFriendAnnouncement: jest.fn()
}));

describe('CompletedDropletBlock', () => {
  const mockDroplet = {
    id: 1,
    name: 'Test Droplet'
  };

  const mockEnrollment = {
    id: 1,
    isFirstTime: true
  };

  const mockAuthUser = {
    id: 1,
    email: 'test@test.com'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders completion message with droplet name', () => {
    render(
      <CompletedDropletBlock
        droplet={mockDroplet as any}
        enrollment={mockEnrollment as any}
        authUser={mockAuthUser as any}
      />
    );
    expect(screen.getByText(/Congratulations/)).toBeInTheDocument();
    expect(screen.getByText(/Test Droplet/)).toBeInTheDocument();
  });

  it('handles share action correctly', async () => {
    (createFriendAnnouncement as jest.Mock).mockResolvedValue({});
    (updateEnrollmentFirstTime as jest.Mock).mockResolvedValue({});

    render(
      <CompletedDropletBlock
        droplet={mockDroplet as any}
        enrollment={mockEnrollment as any}
        authUser={mockAuthUser as any}
      />
    );

    fireEvent.click(screen.getByText('Share with friends'));

    await waitFor(() => {
      expect(createFriendAnnouncement).toHaveBeenCalledWith(mockDroplet, mockAuthUser);
      expect(updateEnrollmentFirstTime).toHaveBeenCalledWith(mockEnrollment.id);
    });
  });
});