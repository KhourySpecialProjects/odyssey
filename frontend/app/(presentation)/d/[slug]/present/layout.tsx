/**
 * Minimal passthrough layout for the (presentation) route group.
 * No sidebar, no footer — just the children rendered directly.
 * The PresentationShell component provides its own fullscreen overlay.
 */
export default function PresentationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
