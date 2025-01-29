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
import { getEnrollmentsByAuthorizedUser } from "@/lib/requests/enrollment";
import { AuthorizedUser, Droplet } from "@/types";
import { DropletsGrid } from "@/components/explore/droplets-grid";

export default async function Settings() {
  const user = await getCurrentUser();
  let completedDropletNames: string[] = [];
  let enrollmentDropletList: Droplet[] = [];
  let enrollmentDroplets = 0;
  let completedDroplets = 0;
  let authorizedUser: AuthorizedUser | null = null;
  if (user?.email) {
    authorizedUser = (await getAuthorizedUserByEmail(
      user.email,
    )) as AuthorizedUser;
    if (!authorizedUser?.id) {
      throw new Error("Authorized user not found");
    }
    const enrollments = await getEnrollmentsByAuthorizedUser(authorizedUser.id);
    enrollmentDropletList = enrollments.map((e) => e.droplet);
    completedDropletNames = enrollments
      .filter((e) => e.viewedLessons.length === e.droplet.lessons?.length)
      .map((d) => d.droplet.name);
    enrollmentDroplets = enrollmentDropletList.length;
    completedDroplets = completedDropletNames.length;
  }

  return (
    <>
      <Card>
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
                  <User2Icon className="w-4 h-4" />
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

          <div className="flex items-center w-full pt-4 space-x-8 border-t sm:pt-0 sm:pl-8 border-t-slate-200 sm:border-t-0 sm:border-l sm:border-l-slate-200">
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
          className={`px-6 py-4 border-b ${
            user?.nuid ? "visibility: visible" : "visibility: hidden"
          }`}
        >
          <p className="text-sm text-slate-600">
            To make changes, update your{" "}
            <Link
              href="https://nam.delve.office.com/?v=editprofile"
              className="underline text-sky-600"
            >
              Northeastern profile
            </Link>
            . You may need to log out and back into Odyssey for changes to take
            effect.
          </p>
        </div>
        <SocialForms authorizedUser={authorizedUser} />
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Completed Droplets</CardTitle>
          <CardDescription>
            All of the droplets that you have finished.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col items-start gap-x-8 gap-y-6 sm:flex-row">
          <div className="flex items-center space-x-3">
            <div>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                <DropletsGrid completion={true} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Statistics</CardTitle>
          <CardDescription>
            Information about droplets that you have interacted with.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col items-start gap-x-8 gap-y-6 sm:flex-row">
          <div className="flex items-center space-x-3">
            <div>
              <div className="font-medium">
                Total Number of Droplets Interacted With
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                {enrollmentDroplets}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div>
              <div className="font-medium">Number of Completed Droplets</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                {completedDroplets}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div>
              <div className="font-medium">Number of In-Progress Droplets</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                {enrollmentDroplets - completedDroplets}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
