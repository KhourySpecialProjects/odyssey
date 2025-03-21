import { render, screen, fireEvent } from '@testing-library/react';
import { DropletName } from '@/components/draft/metadata/droplet-name';
import { useDropletUpdate } from '@/components/draft/metadata/hooks/useDropletUpdate';

jest.mock('@/components/draft/metadata/hooks/useDropletUpdate', () => ({
  useDropletUpdate: jest.fn()
}));

describe('DropletName', () => {
  const mockHandleChange = jest.fn();

  beforeEach(() => {
    (useDropletUpdate as jest.Mock).mockReturnValue({
      error: null,
      handleChange: mockHandleChange
    });
  });

  it('renders name input with initial value', () => {
    render(<DropletName startingName="Test Droplet" dropletId={1} />);
    expect(screen.getByRole('textbox')).toHaveValue('Test Droplet');
  });

  it('shows error message when present', () => {
    (useDropletUpdate as jest.Mock).mockReturnValue({
      error: 'Error updating name',
      handleChange: mockHandleChange
    });

    render(<DropletName startingName="Test Droplet" dropletId={1} />);
    expect(screen.getByText('Error updating name')).toBeInTheDocument();
  });
});