"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";

export default function AccessDenied() {
  return (
    <div className="mx-auto w-full max-w-5xl p-8">
      <h1 className="font-bold">Access Denied</h1>
      <p>
        You must be{" "}
        <Link
          href="/api/auth/signin"
          onClick={(e) => {
            e.preventDefault();
            signIn();
          }}
          className="text-red-600 underline"
        >
          signed in
        </Link>{" "}
        to view this page.
      </p>
    </div>
  );
}
