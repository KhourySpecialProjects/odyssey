import { DropletsSkeleton } from "@/components/explore/droplets-skeleton";
import { AuthorDroplets } from "@/components/settings/author-droplets";
import { BioCard } from "@/components/settings/bio-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/session";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { getInitials, isContentCreator } from "@/lib/utils";
import { User2Icon } from "lucide-react";
import { notFound } from "next/navigation";
import { Suspense } from "react";

export default async function AuthorProfileSettings() {
  const user = await getCurrentUser();
  if (!user?.email) return notFound();
  const authorizedUser = await getAuthorizedUserByEmail(user.email);

  if (!isContentCreator(user.roles)) return notFound();

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Author Profile</CardTitle>
          <CardDescription>
            Your public profile information, shown on Droplets you authored.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex items-center space-x-4">
          <Avatar variant="round">
            <AvatarImage
              src={authorizedUser?.profilePhoto || user?.image || undefined}
            />
            <AvatarFallback>
              {user?.name ? (
                getInitials(user.name)
              ) : (
                <User2Icon className="w-4 h-4" />
              )}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="text-lg font-medium">
              {authorizedUser.firstName + " " + authorizedUser.lastName}
            </div>
          </div>
        </CardContent>

        <CardFooter className="px-6 py-4 border-t">
          <p className="text-sm text-slate-600">
            To make changes, contact an Odyssey Administrator.
          </p>
        </CardFooter>
      </Card>

      <Suspense fallback={<DropletsSkeleton />}>
        <BioCard author={authorizedUser} />
      </Suspense>

      <Suspense fallback={<DropletsSkeleton />}>
        <AuthorDroplets author={authorizedUser} />
      </Suspense>
    </>
  );
}
