import { LoaderCircleIcon } from "lucide-react";

export default function GlobalLoading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm dark:bg-slate-950/80">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          {/* Main spinner */}
          <LoaderCircleIcon className="h-16 w-16 animate-spin text-sky-600" />
          {/* Subtle pulse ring for extra visual appeal */}
          <div className="absolute inset-0 h-16 w-16 animate-ping rounded-full border-2 border-sky-600/20 opacity-75"></div>
        </div>
        <div className="text-center">
          <p className="text-lg font-medium text-slate-900 dark:text-white">Loading</p>
          <p className="text-sm text-slate-600 dark:text-slate-400">Please wait...</p>
        </div>
      </div>
    </div>
  );
}