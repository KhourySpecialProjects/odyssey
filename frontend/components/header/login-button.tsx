"use client";

import { LogInIcon } from "lucide-react";
import { signIn } from "next-auth/react";
import { Button } from "../ui/button";
import { usePathname } from "next/navigation";

export function LoginButton() {
  const pathname = usePathname();

  console.log(
    "process",
    process.env.NEXT_PUBLIC_POSTHOG_KEY?.substring(0, 3),
  );
  console.log(
    "process",
    process.env.NEXT_PUBLIC_POSTHOG_KEY?.substring(10, 13),
  );
  console.log(
    "already works",
    process.env.GITHUB_CLIENT_ID?.substring(10, 13),
  );

  return (
    !pathname.endsWith("/auth/login") && (
      <Button
        role="button"
        size="sm"
        before={<LogInIcon />}
        onClick={() => signIn()}
      >
        Log in
      </Button>
    )
  );
}
