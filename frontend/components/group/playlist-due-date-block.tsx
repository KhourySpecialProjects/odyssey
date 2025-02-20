import { Playlist, AuthorizedUser, Group } from "@/types";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { ChangeEvent, useState } from "react";
import { assignPlaylistDueDate } from "@/lib/requests/groups";

interface PlaylistDueDateBlockProps {
  currentUser: AuthorizedUser;
  existingGroup: Group;
  currentPlaylist: Playlist;
}

export function PlaylistDueDateBlock({
  currentUser,
  existingGroup,
  currentPlaylist,
}: PlaylistDueDateBlockProps) {

  const [isSaveClicked, setIsSaveClicked] = useState(false);
    const [isRemoveClicked, setIsRemoveClicked] = useState(false);
  
    const [removePopupVisible, setRemovePopupVisible] = useState(false);
  
    const [dueDate, setDueDate] = useState<Date | null>(() => {
      const baseDate = existingGroup.playlistDueDates?.find(
        (date) => date.playlistId === currentPlaylist.id,
      )?.baseDueDate;
      return baseDate ? new Date(baseDate) : null;
    });
  
    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
      const inputDueDate = e.target.value;
  
      setDueDate(new Date(inputDueDate));
  
      console.log("due date is ", dueDate);
    };
  
    const handleSaveDate = () => {
      setIsSaveClicked(true);
      const handleSaveDate = async () => {
        await assignPlaylistDueDate(
          existingGroup,
          currentPlaylist,
          dueDate ? dueDate : new Date(),
        );
      };
      handleSaveDate();
      const timeout = setTimeout(() => {
        setIsSaveClicked(false);
      }, 3000);
    };
  
    const handleRemoveDate = () => {
      setRemovePopupVisible(false);
      setIsRemoveClicked(true);
      const handleRemoveDate = async () => {
        await assignPlaylistDueDate(existingGroup, currentPlaylist, null);
        setDueDate(null);
      };
      handleRemoveDate();
      const timeout = setTimeout(() => {
        setIsRemoveClicked(false);
      }, 3000);
    };


  return (
    <div className="flex flex-row justify-between space-x-2 w-full bg-slate-50 border border-slate-200 rounded-lg p-4 items-center">
      {currentPlaylist.name}
      <div className="flex flex-row space-x-2 items-center">
        {isSaveClicked && <p className="text-slate-400">Saved!</p>}
        {isRemoveClicked && <p className="text-slate-400">Removed!</p>}

        <input
          aria-label="Date and time"
          type="datetime-local"
          onChange={(e) => handleInputChange(e)}
          value={dueDate ? dueDate.toISOString().slice(0, 16) : ""}
        />
        <Button
          onClick={() => {
            handleSaveDate();
          }}
          variant="default"
          className="bg-emerald-500 hover:bg-emerald-700"
          disabled={!dueDate}
        >
          Save
        </Button>
        <div>
          <Button
            onClick={() => setRemovePopupVisible(true)}
            variant="default"
            className="bg-red-500 hover:bg-red-700"
            disabled={!dueDate}
          >
            Remove
          </Button>
          <Dialog open={removePopupVisible}>
            <DialogContent>
              <DialogHeader className="flex flex-col items-center text-center">
                <DialogTitle>
                  Are you sure you want to remove this due date?
                </DialogTitle>
              </DialogHeader>

              <div className="flex flex-row justify-center space-x-2 items-center">
                <div className="w-1/3"></div>
                <Button
                  onClick={() => handleRemoveDate()}
                  className="bg-red-500 hover:bg-red-700"
                >
                  Yes, remove it
                </Button>
                <Button
                  onClick={() => setRemovePopupVisible(false)}
                  variant="ghost"
                  size="xs"
                  className="w-1/3"
                >
                  No, take me back
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
