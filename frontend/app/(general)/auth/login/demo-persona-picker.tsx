"use client";

import { Button } from "@/components/ui/button";
import type { DemoAccount } from "@/lib/auth/demo-login";
import { ArrowRightIcon } from "lucide-react";
import { signIn } from "next-auth/react";
import { useState } from "react";

const logInAs = (email: string) =>
  signIn("demo", { email, callbackUrl: "/explore" });

/** The demo environment's login: pick a seeded persona instead of signing in. */
export function DemoPersonaPicker({
  personas,
  others,
}: {
  personas: DemoAccount[];
  others: DemoAccount[];
}) {
  const [otherEmail, setOtherEmail] = useState(others[0]?.email ?? "");

  return (
    <div className="space-y-8 text-left">
      <ul className="grid gap-3 sm:grid-cols-2">
        {personas.map((persona) => (
          <li
            key={persona.email}
            className="flex flex-col rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-slate-900 dark:text-white">
                {persona.name}
              </span>
              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800 dark:bg-sky-900 dark:text-sky-100">
                {persona.role}
              </span>
            </div>
            <p className="mt-1 flex-1 text-sm text-slate-600 dark:text-slate-300">
              {persona.bio}
            </p>
            <Button
              className="mt-3"
              size="sm"
              after={<ArrowRightIcon />}
              onClick={() => logInAs(persona.email)}
              aria-label={`Log in as ${persona.name}`}
            >
              Log in
            </Button>
          </li>
        ))}
      </ul>

      {others.length > 0 && (
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm text-slate-700 dark:text-slate-200">
            Or log in as another student
            <select
              value={otherEmail}
              onChange={(event) => setOtherEmail(event.target.value)}
              className="h-9 rounded-md border border-slate-300 bg-white px-2 dark:border-slate-600 dark:bg-slate-900"
            >
              {others.map((account) => (
                <option key={account.email} value={account.email}>
                  {account.name}
                </option>
              ))}
            </select>
          </label>
          <Button
            size="sm"
            variant="outline"
            onClick={() => logInAs(otherEmail)}
            disabled={!otherEmail}
          >
            Log in as this student
          </Button>
        </div>
      )}
    </div>
  );
}
