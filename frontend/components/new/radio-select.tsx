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
      <div className="font-semibold text-sm py-1.5">
        {label} {firstTime && <span className="text-red-500">*</span>}
      </div>
      <RadioGroup
        className="flex md:flex-row xs:flex-col gap-4"
        value={selected ?? undefined}
        onValueChange={setSelected}
      >
        {items.map((item) => (
          <div
            key={item.id}
            className="flex flex-row items-center justify-start gap-2 m-1"
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
