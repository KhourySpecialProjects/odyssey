import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AddDropletDialog } from '@/components/group/add-droplet-dialog';
import { getDroplets } from '@/lib/requests/droplet';

jest.mock('@/lib/requests/droplet', () => ({
  getDroplets: jest.fn(),
}));

describe('AddDropletDialog', () => {
  const mockDroplets = [
    { id: 1, name: 'Test Droplet', slug: 'test-droplet' }
  ];
  const mockOnAddDroplets = jest.fn();

  beforeEach(() => {
    (getDroplets as jest.Mock).mockResolvedValue(mockDroplets);
  });

  it('renders add droplet button', () => {
    render(<AddDropletDialog currentDroplets={[]} onAddDroplets={mockOnAddDroplets} />);
    expect(screen.getByText('Add Droplet')).toBeInTheDocument();
  });
});