import * as React from "react";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { AdapterLuxon } from "@mui/x-date-pickers/AdapterLuxon";
import { DateTime } from "luxon";

interface MUIDateTimePickerProps {
  date: DateTime | null;
  onChange: (date: DateTime | null) => void;
}

export default function MUIDateTimePicker({
  date,
  onChange,
}: MUIDateTimePickerProps) {
  return (
    <LocalizationProvider dateAdapter={AdapterLuxon}>
      <DateTimePicker
        value={date}
        onChange={(e) => onChange(e)}
        slotProps={{
          textField: {
            inputProps: {
              "data-testid": "picker",
            },
          },
        }}
        sx={{
          backgroundColor: "#CBD5E1",
          borderRadius: "6px",
          width: "240px",
          "& .MuiOutlinedInput-root": {
            backgroundColor: "#CBD5E1",
            borderRadius: "6px",
            "& fieldset": {
              border: "none",
            },
            "&:hover fieldset": {
              border: "none",
            },
            "&.Mui-focused fieldset": {
              border: "none",
            },
          },
          "& .MuiInputBase-input": {
            height: "auto",
            padding: "12px",
            borderRadius: "6px",
            fontSize: "0.925rem",
          },
        }}
      />
    </LocalizationProvider>
  );
}
