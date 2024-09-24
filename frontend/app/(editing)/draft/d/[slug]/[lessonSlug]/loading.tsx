import { LoaderCircleIcon } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex flex-1 w-screen h-screen p-12 items-center justify-center">
      <LoaderCircleIcon className="w-52 h-52 text-slate-200 animate-spin" />
    </div>
  );
}
