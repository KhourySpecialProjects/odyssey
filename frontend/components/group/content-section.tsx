import { ReactNode } from "react";

type ContentSectionProps = {
  title: string;
  content?: string;
  emptyMessage?: string;
  children?: ReactNode;
  action?: ReactNode;
};

export function ContentSection({
  title,
  content,
  emptyMessage,
  children,
  action,
}: ContentSectionProps) {
  return (
    <section className="space-y-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-semibold">{title}</h2>
        {action}
      </div>
      {content ? (
        <div
          dangerouslySetInnerHTML={{
            __html: content || "No description provided.",
          }}
        />
      ) : children ? (
        children
      ) : emptyMessage ? (
        <p className="text-slate-500 italic">{emptyMessage}</p>
      ) : null}
    </section>
  );
}
