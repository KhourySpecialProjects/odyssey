import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, onChange, ...props }, ref) => {
  const [error, setError] = React.useState<string | null>(null);
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;

    // Detect any <tag> pattern
    if (/<[^>]*>/.test(value)) {
      setError("HTML tags are not allowed");
      // Remove the offending tag(s)
      e.target.value = value.replace(/<[^>]*>/g, "");
    } else {
      setError(null);
    }

    onChange?.(e);
  };
  return (
    <textarea
      className={cn(
        "light:ring-offset-white flex min-h-[80px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-500 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:placeholder:text-slate-400 dark:focus-visible:ring-slate-300",
        className,
      )}
      ref={ref}
      onChange={handleChange}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
