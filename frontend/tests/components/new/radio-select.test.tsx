import { render, screen, fireEvent } from '@testing-library/react';
import { RadioSelect } from '@/components/new/radio-select';

describe('RadioSelect', () => {
  const mockItems = [
    { id: 1, name: 'Option 1', value: 'opt1' },
    { id: 2, name: 'Option 2', value: 'opt2' },
  ];
  const mockSetSelected = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders radio options', () => {
    render(
      <RadioSelect
        label="Test Radio"
        items={mockItems}
        selected={null}
        setSelected={mockSetSelected}
      />
    );
    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.getByText('Option 2')).toBeInTheDocument();
  });
});