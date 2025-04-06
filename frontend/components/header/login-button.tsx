"use client";

import { LogInIcon } from "lucide-react";
import { signIn } from "next-auth/react";
import { Button } from "../ui/button";
import { usePathname } from "next/navigation";

export function LoginButton() {
  const pathname = usePathname();

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
