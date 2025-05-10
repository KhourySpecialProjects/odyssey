import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export interface RadioItem {
  id: number;
  name: string;
  value: string;
}

export function RadioSelect({
  label,
  items,
  selected,
  setSelected,
  className = "",
  firstTime,
}: {
  label: string;
  items: RadioItem[];
  selected: string | null;
  setSelected: (selected: string) => void;
  className?: string;
  firstTime?: boolean;
}) {
  return (
    <div className={`flex flex-col items-start ${className}`}>
      <div className="py-1.5 text-sm font-semibold">
        {label} {firstTime && <span className="text-red-500">*</span>}
      </div>
      <RadioGroup
        className="xs:flex-col flex gap-4 md:flex-row"
        value={selected ?? undefined}
        onValueChange={setSelected}
      >
        {items.map((item) => (
          <div
            key={item.id}
            className="m-1 flex flex-row items-center justify-start gap-2"
          >
            <p>{item.name}</p>
            <RadioGroupItem value={item.value}>
              <span>{item.name}</span>
            </RadioGroupItem>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
}
