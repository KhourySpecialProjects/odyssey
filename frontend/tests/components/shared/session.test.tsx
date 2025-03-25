import { render, screen } from '@testing-library/react';
import { Session } from '@/components/shared/session';
import { useSession } from 'next-auth/react';
import useDebugStore from '@/stores/debug-toggle-store';

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

jest.mock('@/stores/debug-toggle-store', () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe('Session', () => {
  beforeEach(() => {
    (useDebugStore as unknown as jest.Mock).mockReturnValue({
      debugModeEnabled: true
    });
  });

  it('renders loading state', () => {
    (useSession as jest.Mock).mockReturnValue({
      status: 'loading',
      data: null,
    });

    render(<Session />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    (useSession as jest.Mock).mockReturnValue({
      data: null,
      status: 'loading'
    });

    render(<Session />);
    
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows session data when loaded', () => {
    const mockSession = {
      user: { name: 'Test User' }
    };

    (useSession as jest.Mock).mockReturnValue({
      data: mockSession,
      status: 'authenticated'
    });

    render(<Session />);
   
    const pre = screen.getByText((content) => 
      content.includes('"name": "Test User"')
    );
    expect(pre).toBeInTheDocument();
  });
});