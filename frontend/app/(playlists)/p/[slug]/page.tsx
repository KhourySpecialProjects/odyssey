import { getPlaylistBySlug } from "@/lib/requests/playlist";
import { notFound } from "next/navigation";
import { DropletTile } from "@/components/droplets/droplet-tile";
import { getCurrentUser } from "@/lib/auth/session";
import { getCachedUser } from "@/lib/requests/cached";
import { getCachedEnrollmentsWithLessonIds } from "@/lib/requests/cached";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { PlaylistEnrollButton } from "@/components/playlists/playlist-enroll-button";
import { Button } from "@/components/ui/button";

interface AuthorizedUser {
  id: number;
  email: string;
}

interface Lesson {
  id: number;
  name: string;
  slug: string;
}

type Props = {
  params: Promise<Params>;
};

type Params = {
  slug: string;
};

export default async function PlaylistPage({ params }: Props) {
  const p = await params;
  const playlist = await getPlaylistBySlug(p.slug, {
    populate: {
      droplets: {
        populate: {
          tags: true,
          lessons: {
            fields: ["id", "name", "slug"],
          },
          fields: [
            "id",
            "name",
            "slug",
            "type",
            "focusArea",
            "learningObjectives",
            "isHidden",
            "status",
          ],
        },
      },
      authorized_users: {
        fields: ["id"],
      },
      authors: {
        fields: ["id", "name"],
        populate: "*",
      },
    },
  });
  if (!playlist) {
    notFound();
  }

  const user = await getCurrentUser();
  let enrolledDropletIds: number[] = [];
  let completedLessonIds: number[] = [];
  let isEnrolled = false;

  if (user?.email) {
    const authorizedUser = await getCachedUser(user.email);
    const enrollments = await getCachedEnrollmentsWithLessonIds(
      authorizedUser.id,
    );
    enrolledDropletIds = enrollments.map((e) => e.droplet.id);

    completedLessonIds = enrollments.flatMap(
      (enrollment) =>
        enrollment.viewedLessons?.map((lesson: { id: number }) => lesson.id) ||
        [],
    );

    isEnrolled =
      playlist.authorized_users?.some(
        (p: AuthorizedUser) => p.id === authorizedUser.id,
      ) || false;
  }

  if (!playlist.isPublic && !isEnrolled) {
    notFound();
  }

  const playlistLessonIds =
    playlist.droplets?.flatMap(
      (droplet) => droplet.lessons?.map((lesson: Lesson) => lesson.id) || [],
    ) || [];

  const dropletStatus =
    playlist.droplets?.map((droplet, index) => {
      const dropletLessonIds = droplet.lessons?.map((l: Lesson) => l.id) || [];
      const completedLessonsInDroplet = completedLessonIds.filter((id) =>
        dropletLessonIds.includes(id),
      );
      return {
        droplet,
        index,
        isComplete:
          dropletLessonIds.length > 0 &&
          completedLessonsInDroplet.length === dropletLessonIds.length,
        progress:
          dropletLessonIds.length > 0
            ? (completedLessonsInDroplet.length / dropletLessonIds.length) * 100
            : 0,
      };
    }) || [];

  const completedDroplets = dropletStatus.filter((d) => d.isComplete);
  const incompleteDroplets = dropletStatus
    .filter((d) => !d.isComplete)
    .sort((a, b) => a.index - b.index);

  const pickUpWhereYouLeftOffDroplet = incompleteDroplets[0];
  const startSomethingNewDroplets = incompleteDroplets.slice(1);

  const totalLessons = playlistLessonIds.length;
  const completedLessons = completedLessonIds.filter((id) =>
    playlistLessonIds.includes(id),
  ).length;
  const progressPercentage = Math.round(
    (completedLessons / totalLessons) * 100,
  );

  return (
    <div className="container py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <h1 className="mb-4 text-4xl font-bold">{playlist.name}</h1>
          <div className="mb-6 flex justify-center gap-4">
            <Badge
              variant="outline"
              className="bg-slate-100 capitalize dark:bg-slate-300 dark:text-black"
            >
              {playlist.duration}
            </Badge>
            <Badge
              variant="outline"
              className="bg-slate-100 dark:bg-slate-300 dark:text-black"
            >
              {totalLessons} {totalLessons === 1 ? "Lesson" : "Lessons"}
            </Badge>
            {!playlist.isPublic && (
              <Badge
                variant="outline"
                className="bg-slate-100 dark:bg-slate-300 dark:text-black"
              >
                Private
              </Badge>
            )}
          </div>
          {user && (playlist.isPublic || isEnrolled) && (
            <div className="mb-6">
              <PlaylistEnrollButton
                playlistId={playlist.id}
                isEnrolled={isEnrolled}
                isPublic={playlist.isPublic}
              />
            </div>
          )}
          <div
            data-testid="edit-button-container"
            className={`pb-2 ${playlist?.authors?.some((author) => author.email === user?.email) ? "visibility: visible" : "visibility: hidden"}`}
          >
            <Link href={`/draft/p/${playlist.slug}`}>
              <Button>Edit Playlist</Button>
            </Link>
          </div>
          {user && (
            <div className="mx-auto mb-4 max-w-md">
              <div className="mb-2 flex justify-center text-sm text-slate-600">
                <span>{progressPercentage}% Complete</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>
          )}
          {playlist.description && (
            <p className="mb-4 text-lg text-slate-600">
              {playlist.description}
            </p>
          )}
        </div>

        {playlist.droplets && playlist.droplets.length > 0 ? (
          <div className="space-y-8">
            {pickUpWhereYouLeftOffDroplet && (
              <section>
                <h2 className="mb-4 text-xl font-semibold">
                  Pick Up Where You Left Off
                </h2>
                <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                  <DropletTile
                    key={pickUpWhereYouLeftOffDroplet.droplet.id}
                    droplet={pickUpWhereYouLeftOffDroplet.droplet}
                    isEnrolled={enrolledDropletIds.includes(
                      pickUpWhereYouLeftOffDroplet.droplet.id,
                    )}
                    completedLessonIds={completedLessonIds}
                  />
                </ul>
              </section>
            )}

            {startSomethingNewDroplets.length > 0 && (
              <section>
                <h2 className="mb-4 text-xl font-semibold">
                  Start Something New
                </h2>
                <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                  {startSomethingNewDroplets.map(({ droplet }) => (
                    <DropletTile
                      key={droplet.id}
                      droplet={droplet}
                      isEnrolled={enrolledDropletIds.includes(droplet.id)}
                      completedLessonIds={completedLessonIds}
                    />
                  ))}
                </ul>
              </section>
            )}

            {completedDroplets.length > 0 && (
              <section>
                <h2 className="mb-4 text-xl font-semibold">
                  Completed Droplets
                </h2>
                <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                  {completedDroplets.map(({ droplet }) => (
                    <DropletTile
                      key={droplet.id}
                      droplet={droplet}
                      isEnrolled={enrolledDropletIds.includes(droplet.id)}
                      completedLessonIds={completedLessonIds}
                    />
                  ))}
                </ul>
              </section>
            )}
          </div>
        ) : (
          <p className="text-center text-slate-600">
            No droplets in this playlist yet.
          </p>
        )}
      </div>
    </div>
  );
}
