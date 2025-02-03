'use client'

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { ArrowRightIcon } from "lucide-react";
import { toast } from "sonner";
import { updateFirstTimeStatus, updateOnboardingInfo } from "@/lib/actions";
import { AuthorizedUser } from "@/types";
import { Input } from "../ui/input";
import Image from "next/image";
import { FriendRequests } from "./friend-requests";
import { FriendRequestBlock } from "./friend-request-block";
import { FriendRequestFeedBlock } from "./friend-request-feed-block";

export function RequestsPopup({ user, friendships }: { user: AuthorizedUser | null, friendships: AuthorizedUser[] | null }) {

    if (!user) return null;

    return (
        <div  >
            <ul className="divide-y divide-slate-200 dark:divide-slate-700 md:space-y-4">

                {friendships?.length && friendships.length > 0 ? (
                    friendships.map((friendship) => (
                        <FriendRequestFeedBlock
                            user={user}
                            request={friendship}
                            key={friendship.id}
                        />
                    ))
                ) : (
                    <p>You have no friends</p>
                )}
            </ul>
        </div>

    );
}
