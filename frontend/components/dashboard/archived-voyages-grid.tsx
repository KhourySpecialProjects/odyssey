import { getCurrentUser } from "@/lib/auth/session";
import { getCachedUser } from "@/lib/requests/cached";
import { getArchivedVoyagesForAuthor } from "@/lib/requests/voyage";
import { EmptyState } from "@/components/ui/empty-state";
import { IconArchive } from "@tabler/icons-react";
import { VoyageCard } from "@/components/voyages/voyage-card";

export async function ArchivedVoyagesGrid() {
  const user = await getCurrentUser();
  if (!user?.email) return null;

  const authorizedUser = await getCachedUser(user.email);
  if (!authorizedUser) return null;
  const voyages = await getArchivedVoyagesForAuthor(authorizedUser.id);

  if (!voyages || voyages.length === 0) {
    return (
      <EmptyState
        icon={
          <IconArchive
            className="h-7 w-7 text-[#475569] dark:text-slate-400"
            stroke={1.5}
          />
        }
        title="No archived voyages"
        message="You haven't archived any voyages yet."
      />
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {voyages.map((voyage) => (
        <li key={voyage.id}>
          <VoyageCard
            voyage={voyage}
            isArchived={true}
            isCreator={true}
            dashboardPage={true}
          />
        </li>
      ))}
    </ul>
  );
}
