import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { AuthorizedUserRoleTitle } from "@/lib/globals";
import {
  chatTitle,
  continueHref,
  relativeTime,
  startedIn,
} from "@/lib/mentor/chat-row";
import { listMentorChats } from "@/lib/requests/mentor-chats";

const RECENT = 3;
const MENTOR_CHATS_HREF = "/activity/mentor-chats";
const linkCls =
  "rounded font-medium text-[#287697] underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#287697] dark:text-[#4AABCF]";

/** The student's 3 newest Mentor chats on the Activity home; renders nothing if there are none or the list fails (ODY-937). */
export async function RecentMentorChats() {
  try {
    const user = await getCurrentUser();
    if (!user?.email || user.roles?.includes(AuthorizedUserRoleTitle.Faculty))
      return null;
    const res = await listMentorChats();
    if (!res.ok || res.data.length === 0) return null;
    const chats = res.data.slice(0, RECENT);

    return (
      <section
        aria-labelledby="recent-mentor-chats-heading"
        className="mb-4 shrink-0 rounded-lg border border-slate-200 p-4 dark:border-slate-700"
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2
            id="recent-mentor-chats-heading"
            className="text-base font-semibold text-slate-900 dark:text-slate-50"
          >
            Recent Mentor chats
          </h2>
          <Link href={MENTOR_CHATS_HREF} className={`text-sm ${linkCls}`}>
            See all
          </Link>
        </div>
        <ul className="space-y-2">
          {chats.map((c) => {
            const where = startedIn(c);
            const when = relativeTime(c.lastMessageAt);
            const href = continueHref(c);
            return (
              <li key={c.documentId} className="text-sm">
                <p className="truncate font-semibold text-slate-900 dark:text-slate-50">
                  {chatTitle(c)}
                </p>
                <p className="truncate text-xs text-slate-600 dark:text-slate-300">
                  {where && `Started in ${where}`}
                  {where && when && " · "}
                  {when}
                </p>
                <Link
                  href={href ?? MENTOR_CHATS_HREF}
                  aria-label={
                    href
                      ? `Continue: ${chatTitle(c)}`
                      : `View in Mentor chats: ${chatTitle(c)}`
                  }
                  className={`text-xs ${linkCls}`}
                >
                  {href ? "Continue in lesson" : "View in Mentor chats"}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    );
  } catch (error) {
    console.error("[mentor] recent chats failed:", (error as Error)?.name);
    return null;
  }
}
