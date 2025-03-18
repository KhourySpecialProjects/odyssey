import { render, screen, fireEvent } from '@testing-library/react';
import TimeZoneSelector from '@/components/settings/time-zone-selector';
import { setTimeZone } from '@/lib/actions';

jest.mock('@/lib/actions', () => ({
  setTimeZone: jest.fn(),
}));

describe('TimeZoneSelector', () => {
  it('renders with current timezone', () => {
    render(<TimeZoneSelector currentZone="America/New_York" userId={1} />);
    expect(screen.getByDisplayValue('America/New_York')).toBeInTheDocument();
  });

  it('calls setTimeZone when changed', async () => {
    render(<TimeZoneSelector currentZone="America/New_York" userId={1} />);
    
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'Europe/London' },
    });

    expect(setTimeZone).toHaveBeenCalledWith('Europe/London', 1);
  });
});