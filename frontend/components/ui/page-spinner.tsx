import { LoaderCircleIcon } from "lucide-react";

export default function PageSpinner() {
  return (
    <div className="flex h-screen w-screen flex-1 items-center justify-center p-12">
      <LoaderCircleIcon
        role="status"
        aria-label="Loading"
        className="h-52 w-52 animate-spin text-slate-200"
      />
    </div>
  );
}
