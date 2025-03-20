import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FirstVisitPopup } from '@/components/first-time/first-visit-popup';
import { toast } from 'sonner';
import { updateFirstTimeStatus, updateOnboardingInfo } from '@/lib/actions';
import { AuthorizedUserRoleTitle } from '@/lib/globals';
import { TimeZone } from '@/types';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() })
}));

jest.mock('@/lib/actions', () => ({
  updateFirstTimeStatus: jest.fn(),
  updateOnboardingInfo: jest.fn()
}));

jest.mock('sonner', () => ({
  toast: { error: jest.fn() }
}));

describe('FirstVisitPopup', () => {
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
    timeZone: "America/New_York" as TimeZone
  };

  it('renders popup when user is first time visitor', () => {
    render(<FirstVisitPopup user={mockUser} />);
    expect(screen.getByText(/welcome to khoury/i)).toBeInTheDocument();
  });

  it('requires first and last name before continuing', async () => {
    render(<FirstVisitPopup user={mockUser} />);
    
    const startButton = screen.getByRole('button', { name: /start exploring/i })
    fireEvent.click(startButton);

    expect(toast.error).toHaveBeenCalledWith('Please enter your first name before continuing');
  });

  it('submits form with valid data', async () => {
    render(<FirstVisitPopup user={mockUser} />);
    
    const firstNameInput = screen.getByLabelText(/first name/i)
    const lastNameInput = screen.getByLabelText(/last name/i)
    
    await fireEvent.change(firstNameInput, {
      target: { value: 'John' }
    })
    await fireEvent.change(lastNameInput, {
      target: { value: 'Doe' }
    })
    
    const startButton = screen.getByRole('button', { name: /start exploring/i })
    await fireEvent.click(startButton)

    await waitFor(() => {
      expect(updateFirstTimeStatus).toHaveBeenCalledWith(mockUser.id);
      expect(updateOnboardingInfo).toHaveBeenCalled();
    });
  });
});