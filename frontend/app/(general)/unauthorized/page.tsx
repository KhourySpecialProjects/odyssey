import { Button } from "@/components/ui/button";
import { authOptions } from "@/lib/authOptions";
import { ArrowRightIcon } from "lucide-react";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function UnauthorizedRoute() {
  const session = await getServerSession(authOptions);
  if (session) return redirect("/admin");

  return (
    <div className="grid min-h-full place-items-center bg-white px-6 py-24 sm:py-32 lg:px-8">
      <div className="text-center">
        <p className="text-base uppercase font-semibold text-indigo-600">
          Error
        </p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          Unauthorized
        </h1>
        <p className="mt-6 text-base leading-7 text-gray-600">
          You do not have permission to access this application.
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Button size="lg" after={<ArrowRightIcon />} asChild>
            <Link href="/request-access">Request Access</Link>
          </Button>
          <Button variant="link" after={<ArrowRightIcon />} asChild>
            <Link href="/explore">Explore the Odyssey</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
