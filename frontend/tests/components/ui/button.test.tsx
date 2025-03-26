import { Button } from "@/components/ui/button";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Link from "next/link";

describe("Button", () => {
  it("renders button with text", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText("Click me")).toBeInTheDocument();
  });

  it("handles click events", async () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    await userEvent.click(screen.getByText("Click me"));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("renders with different variants", () => {
    render(<Button variant="destructive">Delete</Button>);
    expect(screen.getByText("Delete")).toHaveClass("bg-red-500");
  });

  it('renders with before and after icons when asChild is true', () => {
    const beforeIcon = <span data-testid="before-icon">Before</span>;
    const afterIcon = <span data-testid="after-icon">After</span>;
    
    const { getByTestId } = render(
      <Button asChild before={beforeIcon} after={afterIcon}>
        <Link href="/">Link Text</Link>
      </Button>
    );

    expect(getByTestId('before-icon')).toBeInTheDocument();
    expect(getByTestId('after-icon')).toBeInTheDocument();
  });

  it('renders icons with correct classes', () => {
    const icon = <span className="custom-class">Icon</span>;
    
    const { container } = render(
      <Button before={icon}>Test</Button>
    );

    const iconElement = container.querySelector('.custom-class');
    expect(iconElement).toHaveClass('w-4', 'h-4');
  });
  it('renders children without icons when no before/after props provided', () => {
    const { container } = render(
      <Button asChild>
        <Link href="/">Link Text</Link>
      </Button>
    );

    expect(container.textContent).toBe('Link Text');
  });

  describe('Button', () => {
    it('renders icon with correct size when using renderIcon', () => {
      const MockIcon = () => <svg data-testid="test-icon" />;
      
      render(
        <Button before={<MockIcon />}>
          Test Button
        </Button>
      );
  
      const icon = screen.getByTestId('test-icon');
      const iconWrapper = icon.parentElement;
      
      expect(iconWrapper).toHaveClass('inline-flex bg-slate-900');
    });
  
    it('applies icon classes while preserving custom classes', () => {
      const MockIcon = () => <svg className="custom-class" data-testid="test-icon" />;
      
      render(
        <Button before={<MockIcon />}>
          Test Button
        </Button>
      );
  
      const icon = screen.getByTestId('test-icon');
      const iconWrapper = icon.parentElement;
      
      expect(iconWrapper).toHaveClass('inline-flex text-slate-50');
    });
  });
});
