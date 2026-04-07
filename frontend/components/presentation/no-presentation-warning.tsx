import Link from "next/link";

export function NoPresentationWarning({
  dropletSlug,
}: {
  dropletSlug: string;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="mx-auto max-w-md space-y-4 rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="text-4xl">No Presentation Found</div>
        <p className="text-slate-600 dark:text-slate-400">
          This droplet doesn&apos;t have any presentation slides yet. Add slide
          breaks in the lesson editor using the{" "}
          <kbd className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-sm dark:bg-slate-700">
            /
          </kbd>{" "}
          slash menu to create slides.
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
