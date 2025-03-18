import { render, screen } from '@testing-library/react';
import MUIDateTimePicker from '@/components/group/datetime-picker';
import { DateTime } from 'luxon';

describe('MUIDateTimePicker', () => {
  const mockOnChange = jest.fn();
  const mockDate = DateTime.local();

  it('renders date time picker', () => {
    render(<MUIDateTimePicker date={mockDate} onChange={mockOnChange} />);
    expect(screen.getByLabelText('Enter due date')).toBeInTheDocument();
  });

  it('displays selected date', () => {
    render(<MUIDateTimePicker date={mockDate} onChange={mockOnChange} />);
    expect(screen.getByDisplayValue(mockDate.toFormat('MM/dd/yyyy'))).toBeInTheDocument();
  });
});