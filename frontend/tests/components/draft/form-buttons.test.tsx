import { render, screen } from '@testing-library/react';
import { DeleteButton, AddButton } from '@/components/draft/metadata/form-buttons';
import { useFormStatus } from 'react-dom';

jest.mock('react-dom', () => ({
  useFormStatus: jest.fn()
}));

describe('FormButtons', () => {
  describe('DeleteButton', () => {
    it('renders delete text when not pending', () => {
      (useFormStatus as jest.Mock).mockReturnValue({ pending: false });
      render(<DeleteButton />);
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('shows loader when pending', () => {
      (useFormStatus as jest.Mock).mockReturnValue({ pending: true });
      render(<DeleteButton />);
      expect(screen.getByRole('button')).toHaveClass('animate-spin');
    });
  });

  describe('AddButton', () => {
    it('renders corner down left icon when not pending', () => {
      (useFormStatus as jest.Mock).mockReturnValue({ pending: false });
      render(<AddButton />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('shows loader when pending', () => {
      (useFormStatus as jest.Mock).mockReturnValue({ pending: true });
      render(<AddButton />);
      expect(screen.getByRole('button')).toHaveClass('animate-spin');
    });
  });
});