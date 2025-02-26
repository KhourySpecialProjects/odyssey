"use client";

import { Button } from "@/components/ui/button";
import { updateDroplet } from "@/lib/actions";
import { useRouter } from "next/navigation";

export function RegenerateSlugButton({
  name,
  dropletId,
}: {
  name: string;
  dropletId: number;
}) {
  const router = useRouter();

  const regenerateSlug = async (dropletId: number) => {
    const response = await updateDroplet(
      dropletId,
      { name: name },
      { regenerateSlug: true },
    );
    console.log(response);
    if (response.ok && !response.error) {
      router.replace(`/draft/d/${response.data.attributes.slug}`);
    }
  };

  return (
    <Button
      variant="outline"
      className="dark:bg-slate-800 dark:outline dark:outline-slate-500"
      onClick={() => regenerateSlug(dropletId)}
    >
      Regenerate Slug
    </Button>
  );
}
