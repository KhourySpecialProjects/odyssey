import { render, fireEvent } from "@testing-library/react";
import {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
} from "@/components/ui/select";

describe("Select", () => {
  const TestSelect = () => (
    <Select>
      <SelectTrigger>
        <SelectValue placeholder="Select option" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="1">Option 1</SelectItem>
        <SelectItem value="2">Option 2</SelectItem>
      </SelectContent>
    </Select>
  );

  it("renders select trigger", () => {
    const { getByText } = render(<TestSelect />);
    expect(getByText("Select option")).toBeInTheDocument();
  });

  it("shows options when clicked", () => {
    const { getByText, getByRole } = render(<TestSelect />);
    fireEvent.click(getByRole("combobox"));
    expect(getByText("Option 1")).toBeInTheDocument();
    expect(getByText("Option 2")).toBeInTheDocument();
  });

  it("applies correct styling to trigger", () => {
    const { getByRole } = render(<TestSelect />);
    expect(getByRole("combobox")).toHaveClass(
      "flex",
      "h-10",
      "w-full",
      "rounded-md",
    );
  });

  it("exports all required components", () => {
    expect(Select).toBeDefined();
    expect(SelectGroup).toBeDefined();
    expect(SelectValue).toBeDefined();
    expect(SelectTrigger).toBeDefined();
    expect(SelectContent).toBeDefined();
    expect(SelectLabel).toBeDefined();
    expect(SelectItem).toBeDefined();
    expect(SelectSeparator).toBeDefined();
    expect(SelectScrollUpButton).toBeDefined();
    expect(SelectScrollDownButton).toBeDefined();
  });

  it("has correct display names", () => {
    expect(SelectTrigger.displayName).toBe("SelectTrigger");
    expect(SelectContent.displayName).toBe("SelectContent");
    expect(SelectLabel.displayName).toBe("SelectLabel");
    expect(SelectItem.displayName).toBe("SelectItem");
    expect(SelectSeparator.displayName).toBe("SelectSeparator");
    expect(SelectScrollUpButton.displayName).toBe("SelectScrollUpButton");
    expect(SelectScrollDownButton.displayName).toBe("SelectScrollDownButton");
  });
});
