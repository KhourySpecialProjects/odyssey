import Link from "next/link";

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
import { getInitials, condenseRoleTitles } from "@/lib/utils";
import { User2Icon } from "lucide-react";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { getEnrollmentsByAuthorizedUser } from "@/lib/requests/enrollment";
import { Droplet, Enrollment } from "@/types";

export default async function Settings() {
  const user = await getCurrentUser();
  let completedDropletNames: string[] = [];
  let enrollmentDropletNames: string[] = [];
  let enrollmentDroplets = 0;
  let completedDroplets = 0;
  if (user?.email) {
    const authorizedUser = await getAuthorizedUserByEmail(user.email);
    const enrollments = await getEnrollmentsByAuthorizedUser(authorizedUser.id);
    enrollmentDropletNames = enrollments.map((e) => e.droplet.name)
    completedDropletNames = enrollments.filter((e) => e.viewedLessons.length === e.droplet.lessons?.length).map((d) => d.droplet.name)
    enrollmentDroplets = enrollmentDropletNames.length;
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
              <AvatarImage src={user?.image ?? undefined} />
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
            <div>
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
        <CardFooter className="px-6 py-4 border-t">
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
        </CardFooter>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Completed Droplets</CardTitle>
          <CardDescription>All of the droplets that you have finished.</CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col items-start gap-x-8 gap-y-6 sm:flex-row">
          <div className="flex items-center space-x-3">
            <div>
              <div className="font-medium">Completed Droplets</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">
              {enrollmentDropletNames.map((droplet, index) => (
                <div key={index}>
                  {droplet}
                </div>
              ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Statistics</CardTitle>
          <CardDescription>Information about droplets that you have interacted with.</CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col items-start gap-x-8 gap-y-6 sm:flex-row">
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
              {enrollmentDroplets}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div>
              <div className="font-medium">Other Statistic</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                placeholder
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
