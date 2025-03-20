import { DeleteButton } from '@/components/draft/metadata/form-buttons';
import { render, screen } from '@testing-library/react';
import { useFormStatus } from 'react-dom';

// Mock useFormStatus
jest.mock('react-dom', () => ({
  useFormStatus: jest.fn(),
}));

jest.mock('react-dom/client', () => ({
  createRoot: () => ({
    render: jest.fn(),
    unmount: jest.fn(),
  }),
}));


describe('FormButtons', () => {
  describe('DeleteButton', () => {
    it('renders delete text when not pending', () => {
      render(
        <DeleteButton />
      )
      expect(screen.getByRole('button')).toHaveTextContent(/delete/i)
    })

    it('shows loader when pending', () => {
      render(
        <DeleteButton />
      )
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
    })
  })
});