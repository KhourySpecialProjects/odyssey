"use client";

import { Button } from "@/components/ui/button";
import { IconPlus } from "@tabler/icons-react";
import Link from "next/link";

export function CreateDroplet() {
  return (
    <Link href="/new/droplet">
      <Button
        className="dark:bg-slate-300"
        after={<IconPlus />}
        data-testid="create-droplet"
      >
        Create Droplet
      </Button>
    </Link>
  );
}
