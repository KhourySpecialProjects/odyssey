import {
  Message,
  MessageDescription,
  MessageHeader,
} from "@/components/message";

// Same message as the droplets grid shows when the Explore search matches
// nothing
export function NoSearchResults({
  kind,
  query,
}: {
  kind: "Playlists" | "Voyages";
  query: string;
}) {
  return (
    <Message className="mb-8 rounded-md border border-dashed border-slate-200 dark:border-slate-500 dark:bg-slate-800">
      <MessageHeader subtitle="No Results" title={`No ${kind} Found`} />
      <MessageDescription>
        {`There are no ${kind} that match "${query.trim()}".`}
      </MessageDescription>
    </Message>
  );
}
