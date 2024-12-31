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
  action
}: ContentSectionProps) {
  return (
    <section className="space-y-4">
      <div className="flex justify-between items-center mb-4">
      <h2 className="text-2xl font-semibold">{title}</h2>
      {action}
      </div>
      {content ? (
        // <p className="text-slate-600 leading-relaxed">{content}</p>
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
