"use client";

import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import Link from "next/link";

export function CreateDroplet() {
  return (
    <Link href="/new/droplet">
      <Button className="dark:bg-slate-300" after={<PlusIcon />}>
        Create Droplet
      </Button>
    </Link>
  );
}
