import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
// import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { getCurrentUser } from "@/lib/auth/session";
import { getInitials } from "@/lib/utils";
import { User2Icon } from "lucide-react";

export default async function AuthorProfileSettings() {
  const user = await getCurrentUser();

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Author Profile</CardTitle>
          <CardDescription>Your personal profile information.</CardDescription>
        </CardHeader>

        <CardContent className="flex items-center space-x-3">
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
        </CardContent>
        <CardFooter className="px-6 py-4 border-t">
          <p className="text-sm text-slate-600">
            To make changes, contact an Odyssey Administrator.
          </p>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bio</CardTitle>
          <CardDescription>
            The directory within your project, in which your plugins are
            located.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4">
            <Input placeholder="Project Name" defaultValue="/content/plugins" />
            {/* <div className="flex items-center space-x-2">
                    <Checkbox id="include" defaultChecked />
                    <label
                      htmlFor="include"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Allow administrators to change the directory.
                    </label>
                  </div> */}
          </form>
        </CardContent>
        <CardFooter className="px-6 py-4 border-t">
          <Button>Save</Button>
        </CardFooter>
      </Card>
    </>
  );
}
