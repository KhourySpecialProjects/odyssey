import { render, screen, fireEvent } from '@testing-library/react';
import { Selection } from '@/components/draft/metadata/selection';
import { useDropletUpdate } from '@/components/draft/metadata/hooks/useDropletUpdate';

jest.mock('@/components/draft/metadata/hooks/useDropletUpdate', () => ({
  useDropletUpdate: jest.fn()
}));

describe('Selection', () => {
  const mockItems = [
    { id: 1, label: 'Item 1', value: 'item-1', name: "test" },
    { id: 2, label: 'Item 2', value: 'item-2', name: "sample2" }
  ];

  const mockSelectedItems = [mockItems[0]];
  const mockHandleChange = jest.fn();

  beforeEach(() => {
    (useDropletUpdate as jest.Mock).mockReturnValue({
      error: null,
      handleChange: mockHandleChange
    });
  });

  it('displays error message when present', () => {
    (useDropletUpdate as jest.Mock).mockReturnValue({
      error: 'Test error',
      handleChange: mockHandleChange
    });

    render(
      <Selection
        dropletId={1}
        items={mockItems}
        selectedItems={mockSelectedItems}
        variant="postrequisite"
      />
    );
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });
});