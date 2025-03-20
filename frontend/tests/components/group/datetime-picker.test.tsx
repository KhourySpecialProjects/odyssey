import { render, screen } from '@testing-library/react';
import MUIDateTimePicker from '@/components/group/datetime-picker';
import { DateTime } from 'luxon';

describe('MUIDateTimePicker', () => {
  const mockOnChange = jest.fn();
  const mockDate = DateTime.fromJSDate(new Date('2025-03-20T09:19:00'));

  it('renders date time picker', () => {
    render(<MUIDateTimePicker date={mockDate} onChange={mockOnChange} />);
    expect(screen.getByLabelText('Enter due date')).toBeInTheDocument();
  });

  it('displays selected date', () => {
    const mockOnChange = jest.fn()

    render(<MUIDateTimePicker date={mockDate} onChange={mockOnChange} />)
    
    const input = screen.getByRole('textbox')
    expect(input).toHaveValue('03/20/2025 09:19 AM')
  })
});