"use client";

import { Button } from "@/components/ui/button";
import { ArrowRightIcon } from "lucide-react";
import { BuiltInProviderType } from "next-auth/providers/index";
import { ClientSafeProvider, LiteralUnion, signIn } from "next-auth/react";

export default function LoginButtons({
  providers,
}: {
  providers: Record<
    LiteralUnion<BuiltInProviderType, string>,
    ClientSafeProvider
  > | null;
}) {
  if (!providers) throw new Error("No auth providers configured");

  return (
    <div className="space-y-3">
      {Object.values(providers).map((provider: any) => (
        <div key={provider.name}>
          <Button
            onClick={() => signIn(provider.id)}
            after={<ArrowRightIcon />}
            className="dark:bg-slate-300"
          >
            {provider.name === "Azure Active Directory" ? "Log in with My Northeastern" : `Log in with  ${provider.name}`}
          </Button>
        </div>
      ))}
    </div>
  );
}
