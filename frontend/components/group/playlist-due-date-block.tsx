import { Playlist, AuthorizedUser, Group } from "@/types";

interface PlaylistDueDateBlockProps {
    currentUser: AuthorizedUser;
    existingGroup?: Group | null;
    currentPlaylist: Playlist;
}

export function PlaylistDueDateBlock({
    currentUser,
    existingGroup,
    currentPlaylist
}: PlaylistDueDateBlockProps) {


    return (
            <div className="my-0 items-center border border-slate-200 bg-slate-50 rounded-lg p-5">
                {currentPlaylist?.name}
            </div>
    )



}