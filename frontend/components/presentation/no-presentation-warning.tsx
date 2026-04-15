import Link from "next/link";

export function NoPresentationWarning({
  dropletSlug,
  isAuthorOrAdmin = false,
}: {
  dropletSlug: string;
  isAuthorOrAdmin?: boolean;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="mx-auto max-w-md space-y-4 rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h1 className="text-4xl">Presentation Not Available</h1>
        <p className="text-slate-600 dark:text-slate-400">
          {isAuthorOrAdmin
            ? "Presentation mode is not enabled for this droplet. Turn on the Presentation toggle in the editor sidebar to make it available."
            : "Presentation mode is not available for this droplet yet."}
        </p>
        <Link
          href={
            isAuthorOrAdmin ? `/draft/d/${dropletSlug}` : `/d/${dropletSlug}`
          }
          className="inline-block rounded-full bg-indigo-500 px-6 py-2 text-white hover:bg-indigo-600"
        >
          {isAuthorOrAdmin ? "Back to Editor" : "Back to Droplet"}
        </Link>
      </div>
    </div>
  );
}
