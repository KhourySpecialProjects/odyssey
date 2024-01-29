"use client";

import AccessDenied from "@/ui/access-denied";
import { useSession } from "next-auth/react";

export default function Page() {
  const { data } = useSession();

  if (!data) {
    return <AccessDenied />;
  }

  return (
    <div className="w-full max-w-5xl p-8 mx-auto">
      <h1 className="font-bold">Admin Page</h1>
      <p>Only logged-in users can see this page.</p>
      <br />
      <pre className="p-4 text-sm break-words whitespace-pre rounded-md bg-slate-100 text-wrap">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
