import { cn } from "@/lib/utils";

export function GradientBackground({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative isolate min-h-[calc(100vh-12rem)] bg-white px-6 py-12 sm:py-16 lg:px-8 dark:bg-zinc-950",
        className,
      )}
    >
      <div
        className="absolute inset-x-0 top-[-10rem] transform-gpu overflow-hidden blur-3xl sm:top-[-20rem]"
        style={{ zIndex: -1 }}
        aria-hidden="true"
      >
        {/* purple version: from-[#ff80b5] to-[#9089fc] */}
        <div
          className="relative left-1/2 aspect-[1155/678] w-[36.125rem] max-w-none -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#98D1B5] to-[#A0E0EF] opacity-30 sm:left-[calc(50%-40rem)] sm:w-[72.1875rem] dark:opacity-40"
          style={{
            clipPath:
              "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
          }}
        />
      </div>

      {children}
    </div>
  );
}
