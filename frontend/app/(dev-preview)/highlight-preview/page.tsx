// TEMPORARY: local preview for ODY-785. Delete before committing.
import { notFound } from "next/navigation";
import { HighlightPreview } from "./highlight-preview";

export default function HighlightPreviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <HighlightPreview />;
}
