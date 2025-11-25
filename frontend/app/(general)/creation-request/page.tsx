import { ContentCreatorRequestForm } from "@/components/content-creation-request";
import { GradientBackground } from "@/components/gradient-bg";
import { getCurrentUser } from "@/lib/auth/session";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { notFound } from "next/navigation";

export default async function RequestContentCreatorRole() {
  const user = await getCurrentUser();
  if (!user || !user?.email) return notFound();
  const authUser = await getAuthorizedUserByEmail(user?.email);

  return (
    <>
      <GradientBackground>
        <ContentCreatorRequestForm user={authUser} />
      </GradientBackground>
    </>
  );
}
