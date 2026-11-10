import { notFound } from "next/navigation";
import { StreakTestingPanel } from "@/components/streaks/testing/streak-testing-panel";
import { getCurrentUser } from "@/lib/auth/session";
import { getCachedUser } from "@/lib/requests/cached";
import { getStreakFor } from "@/lib/streak-days";
import { streakTestingEnabled, streakTestMode } from "@/lib/streak-testing";
import type { AuthorizedUser } from "@/types";

// The streak testing panel (ODY-921, TEMPORARY: remove before streaks
// launch). The admin layout lets in System Admins only; this page and its
// actions also need testing enabled (not on production).

export const dynamic = "force-dynamic";

export const metadata = { title: "Streak testing" };

export default async function StreakTestingPage() {
  if (!streakTestingEnabled()) notFound();
  const user = await getCurrentUser();
  if (!user?.email) notFound();
  const record = (await getCachedUser(user.email)) as AuthorizedUser;
  const mode = await streakTestMode();
  const streak = await getStreakFor(
    { id: record.id, timeZone: record.timeZone },
    { mode },
  );

  return (
    <div className="w-full px-4 py-4 md:px-[56px] md:py-8">
      <div className="mb-6">
        <h1 className="text-4xl leading-tight font-semibold text-black dark:text-white">
          Streak testing
        </h1>
        <p className="mt-3 text-sm text-[#475569] md:text-[20px] dark:text-slate-400">
          Fake your own streak and date to see the pill, popover, lesson banner,
          revives and feed card. Temporary: it&apos;s removed before streaks
          launch, and never runs on production.
        </p>
      </div>
      <StreakTestingPanel initial={{ streak, mode }} userId={record.id} />
    </div>
  );
}
