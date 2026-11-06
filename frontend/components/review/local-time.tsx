"use client";

import { useEffect, useState } from "react";
import { commentTime } from "@/lib/review-comments";

/** A time in the viewer's zone; empty until mounted, as the server runs in UTC. */
export function LocalTime({ iso }: { iso: string }) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => setText(commentTime(iso)), [iso]);
  return <time dateTime={iso}>{text}</time>;
}
