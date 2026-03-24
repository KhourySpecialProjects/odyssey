"use client";

interface FilterOption {
  value: string;
  label: string;
}

interface FilterCheckboxGroupProps {
  options: readonly FilterOption[];
  selected: string[];
  onToggle: (value: string) => void;
}

export function FilterCheckboxGroup({
  options,
  selected,
  onToggle,
}: FilterCheckboxGroupProps) {
  return (
    <div className="space-y-2">
      {options.map((opt) => (
        <label
          key={opt.value}
          className="flex cursor-pointer items-center gap-2 text-sm text-[#344054]"
        >
          <input
            type="checkbox"
            value={opt.value}
            checked={selected.includes(opt.value)}
            onChange={() => onToggle(opt.value)}
            className="accent-[#2D7597]"
          />
          {opt.label}
        </label>
      ))}
    </div>
  );
}
