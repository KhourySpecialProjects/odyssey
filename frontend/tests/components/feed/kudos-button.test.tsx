import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { KudosButton } from '@/components/feed/kudos-button';
import { giveKudos } from '@/lib/kudos';
import { toast } from 'sonner';

jest.mock('@/lib/kudos', () => ({
  giveKudos: jest.fn()
}));

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() }
}));

describe('KudosButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders button with initial state', () => {
    render(<KudosButton announcementId={1} />);
    expect(screen.getByText('Give Kudos')).toBeInTheDocument();
  });

  it('handles failed kudos submission', async () => {
    (giveKudos as jest.Mock).mockResolvedValue({ success: false });
    
    render(<KudosButton announcementId={1} />);
    fireEvent.click(screen.getByText('Give Kudos'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to give kudos');
      expect(screen.getByRole('button')).toBeVisible();
    });
  });
});