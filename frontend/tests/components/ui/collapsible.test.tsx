import { render, fireEvent } from "@testing-library/react";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";

describe("Collapsible", () => {
  const TestCollapsible = () => (
    <Collapsible>
      <CollapsibleTrigger>Toggle</CollapsibleTrigger>
      <CollapsibleContent>Content</CollapsibleContent>
    </Collapsible>
  );

  it("renders trigger button", () => {
    const { getByText } = render(<TestCollapsible />);
    expect(getByText("Toggle")).toBeInTheDocument();
  });

  it("toggles content visibility", () => {
    const { getByText } = render(<TestCollapsible />);
    const trigger = getByText("Toggle");
    fireEvent.click(trigger);
    expect(getByText("Content")).toBeVisible();
  });
});
