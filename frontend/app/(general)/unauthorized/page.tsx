import UnauthorizedRoute from "./UnauthorizedRoute";

// SearchParams is passed automatically by Next.js to page components
export default async function UnauthorizedPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  // In Next.js 15+, searchParams is a Promise, so await it
  const params = await searchParams;
  const email = params.email || "";

  return <UnauthorizedRoute email={email} />;
}
