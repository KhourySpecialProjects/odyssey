import { authOptions } from "@/lib/auth/options";
import UnauthorizedRoute from "./UnauthorizedRoute";
import { getServerSession } from "next-auth";

// SearchParams is passed automatically by Next.js to page components
export default async function UnauthorizedPage() {
  const session = await getServerSession(authOptions);
  const email = session?.attemptedEmail || "";

  console.log("Given Email: " + email);

  return <UnauthorizedRoute email={email} />;
}
