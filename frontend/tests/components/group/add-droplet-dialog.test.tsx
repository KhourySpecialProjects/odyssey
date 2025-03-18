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

  it('shows dialog with droplets when clicked', async () => {
    render(<AddDropletDialog currentDroplets={[]} onAddDroplets={mockOnAddDroplets} />);
    
    fireEvent.click(screen.getByText('Add Droplet'));
    await waitFor(() => {
      expect(screen.getByText('Test Droplet')).toBeInTheDocument();
    });
  });

  it('filters droplets based on search', async () => {
    render(<AddDropletDialog currentDroplets={[]} onAddDroplets={mockOnAddDroplets} />);
    
    fireEvent.click(screen.getByText('Add Droplet'));
    fireEvent.change(screen.getByPlaceholderText('Search droplets...'), {
      target: { value: 'Test' }
    });
    
    await waitFor(() => {
      expect(screen.getByText('Test Droplet')).toBeInTheDocument();
    });
  });
});