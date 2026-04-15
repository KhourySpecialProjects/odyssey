import Link from "next/link";

export function NoPresentationWarning({
  dropletSlug,
  reason = "disabled",
}: {
  dropletSlug: string;
  reason?: "disabled" | "no-slides";
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="mx-auto max-w-md space-y-4 rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h1 className="text-4xl">
          {reason === "disabled"
            ? "Presentation Not Available"
            : "No Presentation Found"}
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          {reason === "disabled"
            ? "Presentation mode is not enabled for this droplet. Turn on the Presentation toggle in the editor sidebar to make it available."
            : "This droplet doesn't have any presentation slides yet. Add slide breaks in the lesson editor to create slides."}
        </p>
        <Link
          href={`/draft/d/${dropletSlug}`}
          className="inline-block rounded-full bg-indigo-500 px-6 py-2 text-white hover:bg-indigo-600"
        >
          Back to Editor
        </Link>
      </div>
    </div>
  );
}
