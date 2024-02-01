"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";

export default function AccessDenied() {
  return (
    <div className="w-full max-w-5xl p-8 mx-auto">
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
