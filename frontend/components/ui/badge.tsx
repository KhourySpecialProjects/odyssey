import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";
import { Slot } from "@radix-ui/react-slot";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 border border-slate-200 px-2.5 py-0.5 font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 dark:border-slate-800 dark:focus:ring-slate-300",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-slate-900 text-slate-50 dark:bg-slate-50 dark:text-slate-900 dark",
        secondary:
          "border-transparent bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-50 dark",
        destructive:
          "border-transparent bg-red-500 text-slate-50 dark:bg-red-900 dark:text-slate-50 dark",
        outline: "text-slate-950 dark:text-slate-50",
      },
      size: {
        default: "text-xs",
        lg: "text-sm px-3",
        xl: "text-sm py-1 px-3 [&>svg]:w-4 [&>svg]:h-4",
      },
      radius: {
        full: "rounded-full",
        md: "rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      radius: "full",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  after?: React.ReactElement<HTMLElement>;
  before?: React.ReactElement<HTMLElement>;
}

function Badge({
  after,
  before,
  className,
  children,
  radius,
  size,
  variant,
  ...props
}: BadgeProps) {
  // Render an icon with properties applied.
  const renderIcon = (icon: React.ReactElement<HTMLElement>) => {
    const Component = React.isValidElement(icon) ? Slot : "span";
    const iconClasses = cn(icon.props?.className, "w-4 h-4");
    return <Component className={iconClasses}>{icon}</Component>;
  };

  return (
    <div
      className={cn(badgeVariants({ variant, size, radius }), className)}
      {...props}
    >
      {before ? renderIcon(before) : null}
      {children && <>{children}</>}
      {after ? renderIcon(after) : null}
    </div>
  );
}

export { Badge, badgeVariants };
