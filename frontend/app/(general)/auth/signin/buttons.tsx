"use client";

import { Button } from "@/components/ui/button";
import { ArrowRightIcon } from "lucide-react";
import { BuiltInProviderType } from "next-auth/providers/index";
import { ClientSafeProvider, LiteralUnion, signIn } from "next-auth/react";

export default function SignInButtons({
  providers,
}: {
  providers: Record<
    LiteralUnion<BuiltInProviderType, string>,
    ClientSafeProvider
  > | null;
}) {
  if (!providers) throw new Error("No auth providers configured");

  return (
    <>
      {Object.values(providers).map((provider: any) => (
        <div key={provider.name}>
          <Button
            onClick={() => signIn(provider.id)}
            after={<ArrowRightIcon />}
          >
            Sign in with {provider.name}
          </Button>
        </div>
      ))}
    </>
  );
}
