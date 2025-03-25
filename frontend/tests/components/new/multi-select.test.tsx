import { render, screen } from '@testing-library/react';
import { MultiSelect } from '@/components/new/multi-select';

describe('MultiSelect', () => {
  const mockItems = [
    { id: 1, name: 'Item 1' },
    { id: 2, name: 'Item 2' },
  ];
  const mockSetSelected = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders select button with placeholder', () => {
    render(
      <MultiSelect
        label="Tags"
        items={mockItems}
        selected={[]}
        setSelected={mockSetSelected}
      />
    );
    expect(screen.getByText('Select Tags...')).toBeInTheDocument();
  });

  it('shows selected items as badges', () => {
    render(
      <MultiSelect
        label="Tags"
        items={mockItems}
        selected={[mockItems[0]]}
        setSelected={mockSetSelected}
      />
    );
    expect(screen.getByText('Item 1')).toBeInTheDocument();
  });
});