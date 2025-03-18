import { render, screen, fireEvent } from '@testing-library/react';
import { NextStepDisplay } from '@/components/draft/metadata/next-steps/next-step';

describe('NextStepDisplay', () => {
  const mockInitial = {
    id: 1,
    label: 'Test Label',
    url: 'https://test.com'
  };
  const mockUpdate = jest.fn();
  const mockRemove = jest.fn();

  it('renders next step with label', () => {
    render(
      <NextStepDisplay 
        initial={mockInitial}
        update={mockUpdate}
        remove={mockRemove}
      />
    );
    expect(screen.getByText('Test Label')).toBeInTheDocument();
  });

  it('shows edit form when clicked', () => {
    render(
      <NextStepDisplay 
        initial={mockInitial}
        update={mockUpdate}
        remove={mockRemove}
      />
    );
    fireEvent.click(screen.getByText('Test Label'));
    expect(screen.getByDisplayValue('Test Label')).toBeInTheDocument();
    expect(screen.getByDisplayValue('https://test.com')).toBeInTheDocument();
  });

  it('updates next step on change', () => {
    render(
      <NextStepDisplay 
        initial={mockInitial}
        update={mockUpdate}
        remove={mockRemove}
      />
    );
    fireEvent.click(screen.getByText('Test Label'));
    fireEvent.change(screen.getByDisplayValue('Test Label'), {
      target: { value: 'New Label' }
    });
    expect(mockUpdate).toHaveBeenCalledWith({
      id: 1,
      label: 'New Label',
      url: 'https://test.com'
    });
  });
});