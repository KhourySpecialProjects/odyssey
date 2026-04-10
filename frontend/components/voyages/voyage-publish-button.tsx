"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { publishVoyage } from "@/lib/requests/voyage";

export function VoyagePublishButton({ voyageId }: { voyageId: number }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      className="w-full bg-[#297496] text-white hover:bg-[#1e5a73]"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          const result = await publishVoyage(voyageId);
          if (result.ok) {
            router.refresh();
          }
        });
      }}
    >
      {isPending ? "Publishing..." : "Publish Voyage"}
    </Button>
  );
}
