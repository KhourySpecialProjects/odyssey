"use client";

import { AuthorizedUser, Droplet, Group, User } from "@/types";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Playlist } from "@/types";
import { DropletDueDateBlock } from "./droplet-due-date-block";
import { ContentSelector } from "./content-selector";
import { PlaylistDueDateBlock } from "./playlist-due-date-block";
import { Button } from "../ui/button";

interface GroupDueDateDashboardProps {
    currentUser: AuthorizedUser;
    existingGroup: Group;
    searchParams?: { [key: string]: string | string[] | undefined };
    user: User;
}
// TODO: Technical debt abounds.  There are some minor differences between
// several different user types that have caused some headaches.
// Currently, just trying to get the functionality done.  Will refactor
// later.
export function GroupDueDateDashboard({
    currentUser,
    existingGroup,
    searchParams,
    user
}: GroupDueDateDashboardProps) {
    const router = useRouter();
    const tab = searchParams?.tab || "droplets";

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [droplets, setDroplets] = useState<Droplet[]>(
        existingGroup?.droplets || [],
    );
    const [playlists, setPlaylists] = useState<Playlist[]>(
        existingGroup?.playlists || [],
    );
    const [members, setMembers] = useState<User[]>(existingGroup?.members || []);
    const [hasChanges, setHasChanges] = useState(false);

    const [isOpen, setIsOpen] = useState(false);
    const onOpenChange = (open: boolean) => {
        if (!open) {
            setIsOpen(false);
        } else {
            setIsOpen(true);
        }
    };



    const handleCancel = () => {
        router.push(existingGroup ? `/g/${existingGroup.slug}` : "/g/dashboard");
    }



    console.log("droplets are ", existingGroup)

    return (
        <div className="w-full">
            <div className="w-full flex flex-row justify-center mt-2">
                <Button
                    onClick={handleCancel}
                    variant="outline"
                >Back to my group</Button>
            </div>

            <ContentSelector user={user} />
            <div className="mt-6">
                {tab === "droplets" ? (
                    <>
                        {droplets.map((droplet) => (
                            <DropletDueDateBlock
                                key={droplet.id}
                                currentUser={currentUser}
                                existingGroup={existingGroup}
                                currentDroplet={droplet}
                            //curDueDate={}
                            />
                        ))}
                    </>
                ) : tab === "playlists" ? (
                    <>
                        {playlists.map((playlist) => (
                            <PlaylistDueDateBlock
                                key={playlist.id}
                                currentUser={currentUser}
                                existingGroup={existingGroup}
                                currentPlaylist={playlist}
                            />
                        ))}
                    </>
                ) : tab === "extensions" ? (
                    <>
                        Coming Soon!
                    </>
                ) : (
                    <div />
                )}
            </div>
        </div>
    );
}
