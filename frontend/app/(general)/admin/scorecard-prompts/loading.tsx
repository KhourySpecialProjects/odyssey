export default function ScorecardPromptsLoading() {
  return (
    <div className="w-full px-4 py-4 md:px-[56px] md:py-8">
      <div className="mb-6">
        <div className="h-9 w-[240px] animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        <div className="mt-3 h-5 w-[320px] animate-pulse rounded bg-slate-100 md:w-[520px] dark:bg-slate-700" />
      </div>
      <div className="space-y-6">
        {[240, 110, 110].map((height, i) => (
          <div key={i} className="space-y-2">
            <div className="h-5 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
            <div
              className="w-full animate-pulse rounded-md bg-slate-100 dark:bg-slate-800"
              style={{ height }}
            />
          </div>
        ))}
        <div className="h-10 w-20 animate-pulse rounded-md bg-slate-200 dark:bg-slate-700" />
      </div>
    </div>
  );
}
