import { Droplet, AuthorizedUser, Group } from "@/types";
import { DateTimePicker } from "react-datetime-picker";
import { ChangeEvent } from "react";
import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { assignDueDate, getDueDate } from "@/lib/requests/groups";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";

interface DropletDueDateBlockProps {
  currentUser: AuthorizedUser;
  existingGroup: Group;
  currentDroplet: Droplet;
}

export function DropletDueDateBlock({
  currentUser,
  existingGroup,
  currentDroplet,
}: DropletDueDateBlockProps) {
  const [isSaveClicked, setIsSaveClicked] = useState(false);
  const [isRemoveClicked, setIsRemoveClicked] = useState(false);

  const [removePopupVisible, setRemovePopupVisible] = useState(false);


  const [dueDate, setDueDate] = useState<Date | null>(() => {
    const baseDate = existingGroup.dropletDueDates?.find(
      (date) => date.dropletId === currentDroplet.id,
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
      await assignDueDate(
        existingGroup,
        currentDroplet,
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
      await assignDueDate(existingGroup, currentDroplet, null);
      setDueDate(null);
    };
    handleRemoveDate();
    const timeout = setTimeout(() => {
      setIsRemoveClicked(false);
    }, 3000);
  };

  return (
    <div className="flex flex-row justify-between space-x-2 w-full bg-slate-50 border border-slate-200 rounded-lg p-4 items-center">
      {currentDroplet.name}
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
            disabled={!dueDate}>
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
                <Button onClick={() => handleRemoveDate()}  className="bg-red-500 hover:bg-red-700">
                  Yes, remove it
                </Button>
                <Button onClick={() => setRemovePopupVisible(false)} variant="ghost" size="xs" className="w-1/3">
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
