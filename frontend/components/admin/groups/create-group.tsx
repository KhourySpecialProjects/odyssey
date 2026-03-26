"use client";

import { Button } from "@/components/ui/button";
import { IconPlus } from "@tabler/icons-react";
import Link from "next/link";

export function CreateGroup() {
  return (
    <Link href="/g/management">
      <Button className="dark:bg-slate-300" after={<IconPlus />}>
        Create Group
      </Button>
    </Link>
  );
}
