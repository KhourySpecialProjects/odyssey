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


export default async function Settings() {
  const user = await getCurrentUser();

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
                Title
              </div>
              <div className="font-medium">{condenseRoleTitles(user!.roles)}</div>
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
    </>
  );
}
