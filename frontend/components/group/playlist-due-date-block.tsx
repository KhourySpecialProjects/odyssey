import { Playlist, AuthorizedUser, Group } from "@/types";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { ChangeEvent, useEffect, useState } from "react";
import { assignPlaylistDueDate, getGroupDueDate } from "@/lib/requests/groups";

import MUIDateTimePicker from "./datetime-picker";
import { DateTime, Settings } from "luxon";

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

  const [dueDate, setDueDate] = useState<DateTime | null>(null);

  useEffect(() => {
      const getDueDates = async () => {
        const response = await getGroupDueDate(currentPlaylist, existingGroup);
        if (response && 'dueDate' in response) {
          setDueDate(response.dueDate ? DateTime.fromISO(response.dueDate) : null);
        }
      };
      getDueDates();
    }, [currentPlaylist, existingGroup]);

  const handleInputChange = (date: DateTime | null) => {
    if (!date) return;

    setDueDate(date);
    console.log("date is ", date);
  };

  const handleSaveDate = () => {
    setIsSaveClicked(true);
    const handleSaveDate = async () => {
      await assignPlaylistDueDate(
        dueDate ? dueDate.toISO() : DateTime.local().toISO(),
        existingGroup,
        currentPlaylist,
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
      await assignPlaylistDueDate(null, existingGroup, currentPlaylist);
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

        <MUIDateTimePicker
          onChange={handleInputChange}
          date={dueDate}
        ></MUIDateTimePicker>

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
