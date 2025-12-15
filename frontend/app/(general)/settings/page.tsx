import Link from "next/link";
import { SocialForms } from "@/app/(general)/settings/social-forms";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/session";
import { getInitials, condenseRoleTitles } from "@/lib/utils";
import { User2Icon } from "lucide-react";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { AuthorizedUser } from "@/types";

export default async function Settings() {
  const user = await getCurrentUser();
  let authorizedUser: AuthorizedUser | null = null;
  if (user?.email) {
    authorizedUser = (await getAuthorizedUserByEmail(
      user.email,
    )) as AuthorizedUser;
    if (!authorizedUser?.id) {
      throw new Error("Authorized user not found");
    }
  }
  if (!authorizedUser) {
    throw new Error("Authorized user not found");
  }

  return (
    <>
      <Card className="border hover:border-slate-300 dark:border-slate-500 dark:bg-slate-800">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your personal profile information.</CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col items-start gap-x-8 gap-y-6 sm:flex-row">
          <div className="flex items-center space-x-3">
            <Avatar variant="round" size="sm">
              <AvatarImage
                src={authorizedUser?.profilePhoto || user?.image || undefined}
              />
              <AvatarFallback>
                {user?.name ? (
                  getInitials(user.name)
                ) : (
                  <User2Icon className="h-4 w-4" />
                )}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">{user?.name}</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                {user?.email}
              </div>
            </div>
          </div>

          <div className="flex w-full items-center space-x-8 border-t border-t-slate-200 pt-4 sm:border-l sm:border-t-0 sm:border-l-slate-200 sm:pl-8 sm:pt-0">
            <div
              className={`${
                user?.nuid ? "visibility: visible" : "visibility: hidden"
              }`}
            >
              <div className="text-sm text-slate-500 dark:text-slate-400">
                NUID
              </div>
              <div className="font-medium">{user?.nuid}</div>
            </div>
            <div>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Role(s)
              </div>
              <div className="font-medium">
                {condenseRoleTitles(user!.roles)}
              </div>
            </div>
          </div>
        </CardContent>
        <div
          className={`px-6 py-4 ${
            user?.nuid ? "visibility: visible" : "visibility: hidden"
          }`}
        >
          <p className="text-sm text-slate-600 dark:text-slate-300">
            To make changes, update your{" "}
            <Link
              href="https://nam.delve.office.com/?v=editprofile"
              className="text-sky-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-600"
            >
              Northeastern profile
            </Link>
            . You may need to log out and back into Odyssey for changes to take
            effect.
          </p>
        </div>
        <SocialForms authorizedUser={authorizedUser} />
      </Card>
    </>
  );
}
