import { render, screen, fireEvent } from '@testing-library/react';
import { Selection } from '@/components/draft/metadata/selection';
import { useDropletUpdate } from '@/components/draft/metadata/hooks/useDropletUpdate';

jest.mock('@/components/draft/metadata/hooks/useDropletUpdate', () => ({
  useDropletUpdate: jest.fn()
}));

jest.mock('@/components/new/multi-select', () => ({
  MultiSelect: ({ label, selected, setSelected, items }: any) => (
    <div data-testid="multi-select">
      <span>{label}</span>
      <button 
        onClick={() => setSelected([items[0]])} 
        data-testid="select-item"
      >
        Select Item
      </button>
    </div>
  )
}));

describe('Selection', () => {
  const mockItems = [
    { id: 1, name: 'Item 1' },
    { id: 2, name: 'Item 2' },
    { id: 3, name: 'Item 3' }
  ];

  const mockHandleChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useDropletUpdate as jest.Mock).mockReturnValue({
      error: null,
      handleChange: mockHandleChange
    });
  });

  it('renders with prerequisite variant', () => {
    render(
      <Selection
        dropletId={1}
        items={mockItems}
        selectedItems={[mockItems[0]]}
        variant="prerequisite"
      />
    );
    expect(screen.getByText('Prerequisites')).toBeInTheDocument();
  });

  it('renders with postrequisite variant', () => {
    render(
      <Selection
        dropletId={1}
        items={mockItems}
        selectedItems={[mockItems[0]]}
        variant="postrequisite"
      />
    );
    expect(screen.getByText('Postrequisites')).toBeInTheDocument();
  });

  it('renders with tag variant', () => {
    render(
      <Selection
        dropletId={1}
        items={mockItems}
        selectedItems={[mockItems[0]]}
        variant="tag"
      />
    );
    expect(screen.getByText('Tags')).toBeInTheDocument();
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
        selectedItems={[]}
        variant="tag"
      />
    );

    expect(screen.getByText('Test error')).toBeInTheDocument();
  });
});