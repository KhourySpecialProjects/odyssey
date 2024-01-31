"use client";

import { LoaderIcon } from "lucide-react";
import { useSession } from "next-auth/react";

export default function Session() {
  const { data: session, status } = useSession();

  return (
    <section>
      <h1 className="font-bold">Admin Page</h1>
      <p>Only logged-in users can see this page.</p>

      {status === "loading" ? (
        <div
          role="status"
          className="animate-pulse mt-4 p-4 h-48 rounded-md bg-slate-100 items-center justify-center flex "
        >
          <LoaderIcon className="animate-spin" />
        </div>
      ) : (
        <pre className="mt-4 p-4 text-sm break-words whitespace-pre rounded-md bg-slate-100 text-wrap">
          {JSON.stringify(session, null, 2)}
        </pre>
      )}
    </section>
  );
}
