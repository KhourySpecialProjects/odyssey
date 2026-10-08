import { LoaderCircleIcon } from "lucide-react";

// Route-level loading spinner. It fills (and centres in) whatever container the
// route renders into, which is often a column inside a layout (e.g. /activity
// between its sidebar and friends panel). Viewport units (h-screen/w-screen)
// would size it to the whole window and push the spinner off-centre.
export default function PageSpinner() {
  return (
    <div className="flex min-h-[60vh] w-full flex-1 items-center justify-center p-12">
      <LoaderCircleIcon
        role="status"
        aria-label="Loading"
        className="h-52 w-52 animate-spin text-slate-200"
      />
    </div>
  );
}
