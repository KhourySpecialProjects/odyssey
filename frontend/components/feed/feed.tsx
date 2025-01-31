import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { FeedBlock } from "./feed-block";
import { fetchAnnouncements } from "@/lib/requests/feed";

export async function Feed() {
  const user = await getCurrentUser();
  if (!user || !user?.email) return redirect("/");
  const announcements = await fetchAnnouncements();

  return (
    <section>
      <div className="p-4 mt-4 rounded-md bg-slate-100">
        {announcements.length > 0 ? (
          <ul className="divide-y divide-slate-200 dark:divide-slate-700 md:space-y-4">
            {announcements.map((post) => (
              <FeedBlock
                announcement={post}
              />
            ))}
          </ul>
        ) : (
          <p>You have no posts in your feed</p>
        )}
      </div>
    </section>
  );
}
