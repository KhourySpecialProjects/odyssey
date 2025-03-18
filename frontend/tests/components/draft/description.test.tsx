import { render, screen, fireEvent } from '@testing-library/react';
import { Description } from '@/components/draft/metadata/description';
import { useDropletUpdate } from '@/components/draft/metadata/hooks/useDropletUpdate';

jest.mock('@/components/draft/metadata/hooks/useDropletUpdate', () => ({
  useDropletUpdate: jest.fn()
}));

describe('Description', () => {
  const mockHandleChange = jest.fn();

  beforeEach(() => {
    (useDropletUpdate as jest.Mock).mockReturnValue({
      error: null,
      handleChange: mockHandleChange
    });
  });

  it('renders description editor', () => {
    render(<Description dropletId={1} initialContent="Test description" />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('shows error message when present', () => {
    (useDropletUpdate as jest.Mock).mockReturnValue({
      error: 'Error updating description',
      handleChange: mockHandleChange
    });

    render(<Description dropletId={1} initialContent="Test description" />);
    expect(screen.getByText('Error updating description')).toBeInTheDocument();
  });
});