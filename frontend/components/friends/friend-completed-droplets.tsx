"use client";

import { useEffect, useState } from "react";
import { AuthorizedUser, Droplet } from "@/types";
import { getEnrollmentsByAuthorizedUser } from "@/lib/requests/enrollment";
import { ENROLLMENT_POPULATES } from "@/lib/requests/enrollment-populates";
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
      const enrollments = await getEnrollmentsByAuthorizedUser(friend.id, {
        populate: ENROLLMENT_POPULATES.withLessonIds,
      });
      if (enrollments) {
        const completed = enrollments
          .filter((e) => e.viewedLessons.length === e.droplet.lessons?.length)
          .map((d) => d.droplet);
        setCompletedDroplets(completed);
      }
    }

    fetchCompletedDroplets();
  }, [friend.id]);

  return (
    <div className="mt-4 text-center">
      {completedDroplets === null ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : completedDroplets.length > 0 ? (
        <div className="flex flex-col items-center">
          <FriendCompletedDropletsList droplets={completedDroplets} />
        </div>
      ) : (
        <p className="text-sm text-slate-500 dark:text-slate-300">
          No completed droplets yet.
        </p>
      )}
    </div>
  );
}
