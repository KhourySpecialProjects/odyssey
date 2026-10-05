import { getCurrentUser } from "@/lib/auth/session";
import { notFound } from "next/navigation";
import { isAuthorizedUserAdmin } from "@/lib/utils";
import { AuthorizedUser, Lesson } from "@/types";
import { DraftLayoutShell } from "@/components/draft/draft-layout-shell";
import {
  getCachedDraftDropletBySlug,
  getCachedDraftDropletOptions,
  getCachedUser,
} from "@/lib/requests/cached";
import { AuthorizedUserRoleTitle } from "@/lib/globals";
import { SLIDE_BREAK_TYPE } from "@/lib/blocknote/slide-break";

type params = {
  slug: string;
};

type Props = {
  params: Promise<params>;
  children: React.ReactNode;
};

/**
 * The sidebar reads lesson blocks only to detect slide breaks (to enable the
 * presentation preview), so send the browser just those blocks rather than
 * every lesson's full BlockNote document. The query already narrows v1 blocks.
 */
function toSidebarLesson(lesson: Lesson): Lesson {
  return {
    ...lesson,
    blocksV2: Array.isArray(lesson.blocksV2)
      ? lesson.blocksV2.filter(
          (block: { type?: string }) => block.type === SLIDE_BREAK_TYPE,
        )
      : lesson.blocksV2,
  };
}

export default async function CheckPermission({ params, children }: Props) {
  const user = await getCurrentUser();
  const p = await params;
  let authorizedUser: AuthorizedUser | null = null;

  const [cachedUser, droplet, availableDroplets] = await Promise.all([
    user?.email ? getCachedUser(user.email) : Promise.resolve(null),
    getCachedDraftDropletBySlug(p.slug),
    getCachedDraftDropletOptions(),
  ]);

  if (cachedUser) {
    authorizedUser = cachedUser as AuthorizedUser;
  }

  if (!droplet || !user || !droplet.authorized_users || !user.email) {
    return notFound();
  }

  // Check if user is Admin, Content Editor, or an authorized author
  const isAdmin = isAuthorizedUserAdmin(user.roles);
  const isContentEditor = user.roles?.includes(
    AuthorizedUserRoleTitle.ContentEditor,
  );
  const isAuthor = droplet.authorized_users
    .map((author) => author.id)
    .includes(authorizedUser?.id);

  if (!isAdmin && !isContentEditor && !isAuthor) {
    return notFound();
  }

  // DraftLayoutShell is a Client Component: pass only what the sidebar reads
  // so the overview, datasets, relations, etc. aren't serialized to the browser.
  const shellDroplet = {
    id: droplet.id,
    name: droplet.name,
    slug: droplet.slug,
    lessons: droplet.lessons?.map(toSidebarLesson),
    status: droplet.status,
    inReview: droplet.inReview,
    afterReview: droplet.afterReview,
    focusArea: droplet.focusArea,
    learningObjectives: droplet.learningObjectives,
    isHidden: droplet.isHidden,
    type: droplet.type,
    originalDropletId: droplet.originalDropletId,
    difficulty: droplet.difficulty,
    presentationEnabled: droplet.presentationEnabled,
  };

  return (
    <DraftLayoutShell
      droplet={shellDroplet}
      user={user}
      availableDroplets={availableDroplets}
    >
      {children}
    </DraftLayoutShell>
  );
}
