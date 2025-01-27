import { AuthorizedUser, Droplet } from "@/types";
import { getEnrollmentsByAuthorizedUser } from "@/lib/requests/enrollment";
import { DropletTile } from "../droplets/droplet-tile";

export async function FriendCompletedDroplets({ friend }: { friend: AuthorizedUser }) {
  const enrollments = await getEnrollmentsByAuthorizedUser(friend.id);
  const completedDroplets = enrollments
    .filter((e) => e.viewedLessons.length === e.droplet.lessons?.length)
    .map((d) => d.droplet);

  return (
    <div>
      <h3 className="text-sm font-medium text-slate-900">Completed Droplets:</h3>
      {completedDroplets.length === 0 ? (
        <p className="text-sm text-slate-500">No completed droplets yet.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 mt-2 sm:grid-cols-2">
          {completedDroplets.map((droplet) => (
            <DropletTile
              key={droplet.id}
              droplet={droplet}
              profilePage={true}
            />
          ))}
        </ul>
      )}
    </div>
  );
}