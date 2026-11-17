export default function ScorecardPromptsLoading() {
  return (
    <div className="w-full px-4 py-4 md:px-[56px] md:py-8">
      <div className="mb-6">
        <div className="h-9 w-[240px] animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        <div className="mt-3 h-5 w-[320px] animate-pulse rounded bg-slate-100 md:w-[520px] dark:bg-slate-700" />
      </div>
      <div className="space-y-6">
        {["h-[360px]", "h-[220px]", "h-[220px]"].map((height, i) => (
          <div
            key={i}
            className={`${height} animate-pulse rounded-[20px] border border-[#D0D5DD] bg-[#FCFCFD] p-5 md:p-6 dark:border-slate-600 dark:bg-slate-800`}
          >
            <div className="h-5 w-32 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="mt-3 h-4 w-64 rounded bg-slate-100 dark:bg-slate-700" />
          </div>
        ))}
        <div className="flex justify-end">
          <div className="h-[44px] w-24 animate-pulse rounded-[8px] bg-slate-200 dark:bg-slate-700" />
        </div>
      </div>
    </div>
  );
}
