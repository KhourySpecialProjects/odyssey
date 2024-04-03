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
import { getAuthorByAuthorizedUserEmail } from "@/lib/requests/author";
import { getInitials } from "@/lib/utils";
import { notFound } from "next/navigation";

export default async function AuthorProfileSettings() {
  const user = await getCurrentUser();
  if (!user?.email) return notFound();

  const author = await getAuthorByAuthorizedUserEmail(user.email);
  if (!author) return notFound();

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
            <AvatarImage src={author.photo?.formats?.medium.url} />
            <AvatarFallback>{getInitials(author.name)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="text-lg font-medium">{author.name}</div>
          </div>
        </CardContent>
        <CardFooter className="px-6 py-4 border-t">
          <p className="text-sm text-slate-600">
            To make changes, contact an Odyssey Administrator.
          </p>
        </CardFooter>
      </Card>

      <BioCard author={author} />
    </>
  );
}
