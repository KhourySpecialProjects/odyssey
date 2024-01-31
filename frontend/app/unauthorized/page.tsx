"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";

export default function UnauthorizedRoute() {
  const { data: session } = useSession();

  if (session) {
    redirect("/private");
  }

  return (
    <div className="w-full max-w-5xl p-8 mx-auto">
      <h1 className="font-bold">Unauthorized</h1>
      <p>You do not have permission to access this application.</p>
    </div>
  );
}
