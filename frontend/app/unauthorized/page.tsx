import { authOptions } from "@/lib/authOptions";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export default async function UnauthorizedRoute() {
  const session = await getServerSession(authOptions);
  if (session) return redirect("/admin");

  return (
    <div className="w-full max-w-5xl p-8 mx-auto">
      <h1 className="font-bold">Unauthorized</h1>
      <p>You do not have permission to access this application.</p>
    </div>
  );
}
