import { formatUnreadCount } from "@/lib/unread-count";

/** The count pill at the end of a nav row; reads as ", N unread" in the link. */
export function UnreadBadge({ count }: { count: number }) {
  const text = formatUnreadCount(count);
  if (!text) return null;
  return (
    <>
      <span
        aria-hidden="true"
        className="shrink-0 rounded-full bg-[#287697] px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-white dark:bg-[#4AABCF] dark:text-slate-900"
      >
        {text}
      </span>
      <span className="sr-only">, {count} unread</span>
    </>
  );
}
