import { Droplets } from "@/components/admin/droplets/droplets";
import { Playlists } from "@/components/admin/playlists/playlists";
import { Reports } from "@/components/admin/reports/reports";
import { DropletsSkeleton } from "@/components/explore/droplets-skeleton";
import { FriendRequests } from "@/components/friends/friend-requests";
import { FriendSuggestions } from "@/components/friends/friend-suggestions";
import { Friends } from "@/components/friends/friends";
import { AuthorDroplets } from "@/components/settings/author-droplets";
import { BioCard } from "@/components/settings/bio-card";
import { AdminSelector } from "@/components/shared/selector";
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
import { Suspense } from "react";

export default async function AuthorProfileSettings() {
  const user = await getCurrentUser();
  if (!user?.email) return notFound();

  const author = await getAuthorByAuthorizedUserEmail(user.email);
  if (!author) return notFound();

  return (
    <>
      <AdminSelector
        content={{
          "Friends": <Friends />,
          "Friend Requests": <FriendRequests />,
          "People You May Know": <FriendSuggestions />,
        }}
      />

      
    </>
  );
}
