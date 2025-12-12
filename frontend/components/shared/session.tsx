"use client";

import { LoaderIcon } from "lucide-react";
import { useSession } from "next-auth/react";

export function Session() {
  const { data: session, status } = useSession();

  return (
    <section>
      <h1 className="font-bold">Admin Page</h1>
      <p>Only logged-in users can see this page.</p>

      {status === "loading" ? (
        <div
          role="status"
          className="mt-4 flex h-48 animate-pulse items-center justify-center rounded-md bg-slate-100 p-4 dark:bg-slate-800"
        >
          <LoaderIcon className="animate-spin" />
        </div>
      ) : (
        <pre className="mt-4 whitespace-pre text-wrap break-words rounded-md bg-slate-100 p-4 text-sm dark:bg-slate-800">
          {JSON.stringify(session, null, 2)}
        </pre>
      )}
    </section>
  );
}
