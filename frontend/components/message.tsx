import { cn } from "@/lib/utils";

export function Message({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("w-full max-w-5xl p-8 mx-auto", className)}>
      <div className="grid min-h-full px-6 py-24 text-center bg-white dark:bg-slate-800 place-items-center sm:py-32 lg:px-8">
        {children}
      </div>
    </div>
  );
}

export function MessageHeader({
  subtitle,
  title,
}: {
  subtitle: string;
  title: string;
}) {
  return (
    <>
      <p className="text-base font-semibold uppercase text-sky-600">
        {subtitle}
      </p>
      <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-300 sm:text-5xl">
        {title}
      </h1>
    </>
  );
}

export function MessageDescription({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <p className="mt-6 text-base leading-7 text-slate-600 dark:text-slate-400">
      {children}
    </p>
  );
}

export function MessageActions({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center mt-10 md:flex-row gap-x-4 gap-y-3">
      {children}
    </div>
  );
}
