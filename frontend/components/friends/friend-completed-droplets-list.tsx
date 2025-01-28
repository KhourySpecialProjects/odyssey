import { Droplet } from "@/types";
import Link from "next/link";
import { DropletTile } from "../droplets/droplet-tile";

export function FriendCompletedDropletsList({ droplets }: { droplets: Droplet[] }) {
  return (
    <div className="mt-2 space-y-2">
      <ul className="list-none p-0">
        {droplets.map((droplet) => (
          <DropletTile
            key={droplet.id}
            droplet={droplet}
            isEnrolled={true}
            completedLessonIds={[]}
            compact={true}
          />
        ))}
      </ul>
    </div>
  );
}
