import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 dark:ring-offset-slate-950 dark:focus-visible:ring-slate-300",
  {
    variants: {
      variant: {
        default:
          "bg-slate-900 text-slate-50 hover:bg-slate-900/90 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-50/90",
        destructive:
          "bg-red-500 text-slate-50 hover:bg-red-500/90 dark:bg-red-900 dark:text-slate-50 dark:hover:bg-red-900/90",
        outline:
          "border border-slate-200 bg-white hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-800 dark:hover:text-slate-50",
        secondary:
          "bg-slate-100 text-slate-900 hover:bg-slate-100/80 dark:bg-slate-800 dark:text-slate-50 dark:hover:bg-slate-800/80",
        ghost:
          "hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-50",
        link: "text-slate-900 underline-offset-4 hover:underline dark:text-slate-50",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  after?: React.ReactElement<HTMLElement>;
  asChild?: boolean;
  before?: React.ReactElement<HTMLElement>;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      after,
      asChild = false,
      before,
      children,
      className,
      variant,
      size,
      ...props
    },
    ref
  ) => {
    const useAsChild = asChild && React.isValidElement(children);
    const Comp = asChild ? Slot : "button";

    // Render an icon with size, variant, and destructive properties applied.
    const renderIcon = (icon: React.ReactElement<HTMLElement>) => {
      const Component = React.isValidElement(icon) ? Slot : "span";
      const iconClasses = cn(icon.props?.className, "w-4 h-4");
      return <Component className={iconClasses}>{icon}</Component>;
    };

    const innerContent = useAsChild ? (
      React.cloneElement(children as React.ReactElement<any>, {
        children: (
          <>
            {before ? renderIcon(before) : null}
            {children && <>{children.props.children}</>}
            {after ? renderIcon(after) : null}
          </>
        ),
      })
    ) : (
      <>
        {before ? renderIcon(before) : null}
        {children && <span className="px-2">{children}</span>}
        {after ? renderIcon(after) : null}
      </>
    );

    return (
      <>
        <Comp
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          {...props}
        >
          {innerContent}
        </Comp>
      </>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
