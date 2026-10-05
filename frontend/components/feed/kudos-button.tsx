"use client";

import { Announcement, AuthorizedUser, Droplet } from "@/types";
import { Button } from "../ui/button";
import { giveKudos } from "@/lib/kudos";
import { ThumbsUp } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

export function KudosButton({
  announcement,
  droplet,
  authUser,
}: {
  announcement: Announcement;
  droplet: Droplet;
  authUser: AuthorizedUser;
}) {
  const [isPending, startTransition] = useTransition();
  const serverKudos = announcement.kudosGiven ?? [];
  const serverGiven = serverKudos.some((user) => user.id === authUser.id);
  const [kudosGiven, setKudosGiven] = useState(serverGiven);
  const [kudosCount, setKudosCount] = useState(serverKudos.length);

  // The feed keeps its announcement objects after a kudos mutation, so the
  // count is tracked locally. Resync when the prop describes different kudos.
  const propKey = `${announcement.id}:${serverKudos.map((u) => u.id).join(",")}:${authUser.id}`;
  const [seenPropKey, setSeenPropKey] = useState(propKey);
  if (propKey !== seenPropKey) {
    setSeenPropKey(propKey);
    setKudosGiven(serverGiven);
    setKudosCount(serverKudos.length);
  }

  const handleClick = () => {
    startTransition(async () => {
      const result = await giveKudos(announcement.id, droplet);
      if (result.success) {
        toast.success("Kudos given!");
        if (!kudosGiven) setKudosCount((count) => count + 1);
        setKudosGiven(true);
      } else {
        toast.error("Failed to give kudos");
      }
    });
  };

  return (
    <Button
      type="button"
      size="xs"
      onClick={handleClick}
      disabled={isPending || kudosGiven}
      aria-label={kudosGiven ? "Kudos already given" : "Give kudos"}
      className={`rounded-3xl bg-transparent text-slate-500 hover:bg-transparent dark:bg-transparent dark:text-slate-200 dark:hover:bg-transparent`}
    >
      <div className="flex flex-row items-center gap-1">
        {kudosCount > 0 && (
          <p className="text-xl font-bold text-slate-900 dark:text-slate-200">
            {kudosCount}
          </p>
        )}
        <ThumbsUp
          className={`h-6 w-6 ${
            kudosGiven
              ? "fill-slate-900 stroke-slate-900 dark:fill-slate-200 dark:stroke-slate-200"
              : "fill-none stroke-slate-900 hover:fill-slate-900 dark:stroke-slate-200 dark:hover:fill-slate-200"
          }`}
        />
      </div>
    </Button>
  );
}
