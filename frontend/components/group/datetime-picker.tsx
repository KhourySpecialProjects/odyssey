import * as React from 'react';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { AdapterLuxon } from '@mui/x-date-pickers/AdapterLuxon';
import { DateTime } from 'luxon';

interface MUIDateTimePickerProps  {
    date: DateTime | null;
    onChange: (date: DateTime | null) => void
}

export default function MUIDateTimePicker({date, onChange}: MUIDateTimePickerProps) {

  return (
    <LocalizationProvider dateAdapter={AdapterLuxon}>
      <DateTimePicker label="Enter due date"
        value={date}
        onChange={(e) => onChange(e)}/>
    </LocalizationProvider>
  );
}