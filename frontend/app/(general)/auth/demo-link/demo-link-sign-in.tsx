"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

/** Logs in with a one-time demo login link's token, then goes to callbackUrl. */
export function DemoLinkSignIn({
  token,
  callbackUrl,
}: {
  token: string;
  callbackUrl: string;
}) {
  const [failed, setFailed] = useState(false);
  // The token works once, so never send it twice (React runs effects twice
  // in development)
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    signIn("demo-link", { token, redirect: false }).then((result) => {
      if (result?.ok && !result.error) window.location.assign(callbackUrl);
      else setFailed(true);
    });
  }, [token, callbackUrl]);

  if (!failed) {
    return (
      <p role="status" className="text-lg text-slate-600 dark:text-slate-300">
        Logging you in…
      </p>
    );
  }
  return (
    <div role="alert">
      <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
        This login link doesn&apos;t work
      </h2>
      <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
        Login links work once and expire after 10 minutes. Ask for a new one, or{" "}
        <Link href="/auth/login" className="underline">
          pick a persona
        </Link>
        .
      </p>
    </div>
  );
}
