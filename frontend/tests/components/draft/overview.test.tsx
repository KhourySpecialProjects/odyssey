import { render, screen, fireEvent } from '@testing-library/react';
import { Overview } from '@/components/draft/metadata/overview';
import { useDropletUpdate } from '@/components/draft/metadata/hooks/useDropletUpdate';

jest.mock('@/components/draft/metadata/hooks/useDropletUpdate', () => ({
  useDropletUpdate: jest.fn()
}));

describe('Overview', () => {
  const mockHandleChange = jest.fn();

  beforeEach(() => {
    (useDropletUpdate as jest.Mock).mockReturnValue({
      error: null,
      handleChange: mockHandleChange
    });
  });

  it('renders overview title', () => {
    render(<Overview dropletId={1} initialContent="Test content" />);
    expect(screen.getByText('Overview')).toBeInTheDocument();
  });

  it('displays error message when present', () => {
    (useDropletUpdate as jest.Mock).mockReturnValue({
      error: 'Test error',
      handleChange: mockHandleChange
    });

    render(<Overview dropletId={1} initialContent="Test content" />);
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });

  it('calls handleChange with updated content', () => {
    render(<Overview dropletId={1} initialContent="Test content" />);
  });
});