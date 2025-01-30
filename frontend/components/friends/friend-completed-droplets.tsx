"use client";

import { useEffect, useState } from "react";
import { AuthorizedUser, Droplet } from "@/types";
import { getEnrollmentsByAuthorizedUser } from "@/lib/requests/enrollment";
import { FriendCompletedDropletsList } from "./friend-completed-droplets-list";

export function FriendCompletedDroplets({
  friend,
}: {
  friend: AuthorizedUser;
}) {
  const [completedDroplets, setCompletedDroplets] = useState<Droplet[] | null>(
    null,
  );

  useEffect(() => {
    async function fetchCompletedDroplets() {
      const enrollments = await getEnrollmentsByAuthorizedUser(friend.id);
      const completed = enrollments
        .filter((e) => e.viewedLessons.length === e.droplet.lessons?.length)
        .map((d) => d.droplet);
      setCompletedDroplets(completed);
    }

    fetchCompletedDroplets();
  }, [friend.id]);

  return (
    <div className="mt-4">
      {completedDroplets === null ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : completedDroplets.length > 0 ? (
        <FriendCompletedDropletsList droplets={completedDroplets} />
      ) : (
        <p className="text-sm text-slate-500">No completed droplets yet.</p>
      )}
    </div>
  );
}
