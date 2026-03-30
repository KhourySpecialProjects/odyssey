"use client";

interface SortGroup {
  header: string;
  options: readonly { value: string; label: string }[];
}

interface SortRadioGroupProps {
  groups: readonly SortGroup[];
  value: string;
  onChange: (value: string) => void;
}

export function SortRadioGroup({
  groups,
  value,
  onChange,
}: SortRadioGroupProps) {
  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <div key={group.header}>
          <p className="mb-1.5 text-xs font-semibold tracking-wide text-[#667085] uppercase">
            {group.header}
          </p>
          <div className="space-y-1.5">
            {group.options.map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-center gap-2 text-sm text-[#344054]"
              >
                <input
                  type="radio"
                  name="sort-option"
                  value={opt.value}
                  checked={value === opt.value}
                  onChange={() => onChange(opt.value)}
                  className="accent-[#2D7597]"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
