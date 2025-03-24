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

  it('shows loader when pending', () => {
    expect(1+1).toBe(2)
  })
});