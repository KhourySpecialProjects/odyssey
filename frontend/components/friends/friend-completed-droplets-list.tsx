import { Droplet } from "@/types";
import { DropletTile } from "../droplets/droplet-tile";

export function FriendCompletedDropletsList({
  droplets,
}: {
  droplets: Droplet[];
}) {
  return (
    <div className="mt-2 space-y-2">
      <ul className="list-none space-y-1 p-0">
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
