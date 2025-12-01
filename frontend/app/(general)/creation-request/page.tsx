import { ContentCreatorRequestForm } from "@/components/requests/content-creation-request";
import { PendingRequestCard } from "@/components/requests/pending-request-card";
import { GradientBackground } from "@/components/gradient-bg";
import { getCurrentUser } from "@/lib/auth/session";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { fetchCreationRequestByUser } from "@/lib/actions";
import { notFound } from "next/navigation";

export default async function RequestContentCreatorRole() {
  const user = await getCurrentUser();
  if (!user || !user?.email) return notFound();

  const authUser = await getAuthorizedUserByEmail(user?.email);
  if (!authUser) return notFound();

  // Check if user already has a pending creation request
  const existingRequest = await fetchCreationRequestByUser(authUser.id);

  if (existingRequest) {
    return (
      <GradientBackground>
        <PendingRequestCard request={existingRequest} />
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <ContentCreatorRequestForm user={authUser} />
    </GradientBackground>
  );
}
