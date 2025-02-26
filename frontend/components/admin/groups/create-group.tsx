"use client";

import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import Link from "next/link";

export function CreateGroup() {
  return (
    <Link href="/g/management">
      <Button className="dark:bg-slate-300" after={<PlusIcon />}>
        Create Group
      </Button>
    </Link>
  );
}
