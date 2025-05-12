import { LoaderCircleIcon } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex h-screen w-screen flex-1 items-center justify-center p-12">
      <LoaderCircleIcon className="h-52 w-52 animate-spin text-slate-200" />
    </div>
  );
}
