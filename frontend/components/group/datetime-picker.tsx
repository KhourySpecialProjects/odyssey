"use client";

import { useState, type ChangeEvent } from "react";
import { DateTime, Settings } from "luxon";
import { Input } from "@/components/ui/input";

/** Value format of `<input type="datetime-local">` (minute precision). */
const INPUT_FORMAT = "yyyy-MM-dd'T'HH:mm";

interface DateTimePickerProps {
  date: DateTime | null;
  onChange: (date: DateTime | null) => void;
  "aria-label"?: string;
}

function toInputValue(date: DateTime | null): string {
  return date?.isValid ? date.toFormat(INPUT_FORMAT) : "";
}

export default function DateTimePicker({
  date,
  onChange,
  "aria-label": ariaLabel = "Due date",
}: DateTimePickerProps) {
  // Wall-clock time is shown and parsed in the incoming value's zone. With no
  // value, fall back to luxon's default zone, which is what the callers'
  // DateTime.fromISO() / DateTime.local() produce.
  const zone = date?.zone ?? Settings.defaultZone;
  const formatted = toInputValue(date);

  // Keep the raw input string locally so partially cleared segments aren't
  // overwritten mid-edit; resync whenever the `date` prop changes.
  const [inputValue, setInputValue] = useState(formatted);
  const [syncedValue, setSyncedValue] = useState(formatted);
  if (formatted !== syncedValue) {
    setSyncedValue(formatted);
    setInputValue(formatted);
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setInputValue(raw);

    if (!raw) {
      onChange(null);
      return;
    }

    const parsed = DateTime.fromFormat(raw, INPUT_FORMAT, { zone });
    // Some browsers include seconds (yyyy-MM-ddTHH:mm:ss).
    const next = parsed.isValid ? parsed : DateTime.fromISO(raw, { zone });
    onChange(next.isValid ? next : null);
  };

  return (
    // The app's standard text field, so light/dark styling, height and focus
    // match the other inputs
    <Input
      type="datetime-local"
      data-testid="picker"
      aria-label={ariaLabel}
      value={inputValue}
      onChange={handleChange}
      className="w-52 sm:w-60"
    />
  );
}
