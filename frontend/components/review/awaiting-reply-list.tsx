import Link from "next/link";
import type { AwaitingReply } from "@/lib/requests/reviews";
import { LocalTime } from "@/components/review/local-time";

const threadsText = (n: number) =>
  `${n} ${n === 1 ? "thread" : "threads"} waiting on you`;

/** Drafts where a creator replied to the reviewer's feedback (ODY-894). */
export function AwaitingReplyList({ rows }: { rows: AwaitingReply[] }) {
  if (rows.length === 0) return null;
  return (
    <section aria-labelledby="awaiting-reply-heading" className="mb-8">
      <h2
        id="awaiting-reply-heading"
        className="mb-3 text-2xl font-semibold text-black dark:text-white"
      >
        Waiting on you
      </h2>
      <ul className="flex flex-col gap-2">
        {rows.map((row) => (
          <li
            key={row.dropletId}
            className="rounded-md border border-slate-200 bg-slate-50 transition-colors hover:border-slate-300 dark:border-slate-500 dark:bg-slate-800"
          >
            <Link
              href={`/draft/d/${row.slug}`}
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3"
            >
              <span className="font-medium text-black dark:text-white">
                {row.name}
              </span>
              <span className="text-sm text-[#475569] dark:text-slate-400">
                {threadsText(row.threads)}
                {row.lastReplyAt && (
                  <>
                    {" · Last reply "}
                    <LocalTime iso={row.lastReplyAt} />
                  </>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
