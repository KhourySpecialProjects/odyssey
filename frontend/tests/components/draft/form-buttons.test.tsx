import { DeleteButton } from '@/components/draft/metadata/form-buttons';
import { render, screen } from '@testing-library/react';
import { useFormStatus } from 'react-dom';

// Mock useFormStatus
jest.mock('react-dom', () => ({
  useFormStatus: jest.fn(),
}));

describe('FormButtons', () => {
  describe('DeleteButton', () => {
    it('renders delete text when not pending', () => {
      (useFormStatus as jest.Mock).mockReturnValue({ pending: false });
      render(
        <DeleteButton />
      );
      expect(screen.getByRole('button')).toHaveTextContent(/delete/i);
    });

    it('shows loader when pending', () => {
      (useFormStatus as jest.Mock).mockReturnValue({ pending: true });
      render(
        <DeleteButton />
          
      );
      // Look for the loading spinner container instead of status role
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });
  });
});