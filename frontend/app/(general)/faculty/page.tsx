import { AccessManager } from "@/components/shared/access-manager/access-manager";
import { Session } from "@/components/shared/session";
import { AdminSelector } from "@/components/shared/selector";
import { getCurrentUser } from "@/lib/auth/session";
import { notFound } from "next/navigation";
import { isAuthorizedUserFaculty } from "@/lib/utils";

export default async function Page() {
    const user = await getCurrentUser();
    if (!user || !isAuthorizedUserFaculty(user.roles)) return notFound();

    return (
        <div className="w-full max-w-5xl p-8 mx-auto space-y-12">
            <Session />
            <AdminSelector
                content={{
                    "Access Manager": <AccessManager />,
                }}
            />
        </div>
    );
}
