"use client";

import { LogInIcon } from "lucide-react";
import { signIn } from "next-auth/react";
import { Button } from "../ui/button";

export function LoginButton() {
  return (
    <Button size="sm" before={<LogInIcon />} onClick={() => signIn("azure-ad")}>
      Log in
    </Button>
  );
}
