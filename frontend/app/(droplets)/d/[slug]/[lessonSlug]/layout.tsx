type Props = {
  children: React.ReactNode;
};

// Pass-through. The parent d/[slug] layout and the lesson page already
// notFound() on a missing droplet/lesson, so no fetch is needed here.
export default function RootLayout({ children }: Props) {
  return <>{children}</>;
}
