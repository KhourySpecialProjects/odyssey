import { getCurrentUser } from "@/lib/auth/session";
import { getAuthorByAuthorizedUserEmail } from "@/lib/requests/author";
import { getPlaylistsByAuthor } from "@/lib/requests/playlist";
import { notFound } from "next/navigation";

export default async function ProgressPage() {
  const user = await getCurrentUser();
  if (!user?.email) return notFound();

  const author = await getAuthorByAuthorizedUserEmail(user.email);
  if (!author) return notFound();

  const playlists = await getPlaylistsByAuthor(author.id, {
    filters: {
      isPublic: false
    },
    populate: {
      authorizedUsers: {
        fields: ['id', 'email']
      }
    }
  });

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Student Progress</h1>
        <p className="text-gray-500">Track student progress in your private playlists</p>
      </div>
      <PrivatePlaylistsList playlists={playlists} />
    </div>
  );
} 