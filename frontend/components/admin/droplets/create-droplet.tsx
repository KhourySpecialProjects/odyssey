"use client";

import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import Link from "next/link";

export function CreateDroplet() {

  return (
    <Link href="/new/droplet">
        <Button after={<PlusIcon />}>
            Create Droplet
        </Button>
    </Link>
  );
}
