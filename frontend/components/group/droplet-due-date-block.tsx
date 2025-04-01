import { Droplet, AuthorizedUser, Group } from "@/types";
import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { assignDropletDueDate, getGroupDueDate } from "@/lib/requests/groups";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";

import MUIDateTimePicker from "./datetime-picker";
import { DateTime } from "luxon";
import { Check, Trash2Icon } from "lucide-react";

interface DropletDueDateBlockProps {
  existingGroup: Group;
  currentDroplet: Droplet;
}

export function DropletDueDateBlock({
  existingGroup,
  currentDroplet,
}: DropletDueDateBlockProps) {
  const [isSaveClicked, setIsSaveClicked] = useState(false);
  const [isRemoveClicked, setIsRemoveClicked] = useState(false);

  const [removePopupVisible, setRemovePopupVisible] = useState(false);

  const [dueDate, setDueDate] = useState<DateTime | null>(null);

  useEffect(() => {
    const getDueDates = async () => {
      const response = await getGroupDueDate(currentDroplet, existingGroup);
      if (response && "dueDate" in response) {
        setDueDate(
          response.dueDate ? DateTime.fromISO(response.dueDate) : null,
        );
      }
    };
    getDueDates();
  }, [currentDroplet, existingGroup]);

  const handleInputChange = (date: DateTime | null) => {
    if (!date) return;
    setDueDate(date);
  };

  const handleSaveDate = () => {
    setIsSaveClicked(true);
    const handleSaveDate = async () => {
      await assignDropletDueDate(
        dueDate?.toISO() || "America/New_York",
        existingGroup,
        currentDroplet,
      );
    };
    handleSaveDate();
  };

  const handleRemoveDate = () => {
    setRemovePopupVisible(false);
    setIsRemoveClicked(true);
    const handleRemoveDate = async () => {
      await assignDropletDueDate(null, existingGroup, currentDroplet);
      setDueDate(null);
    };
    handleRemoveDate();
  };

  return (
    <div className="flex flex-row text-xl justify-between space-x-2 w-full bg-slate-50 border border-slate-200 rounded-lg p-4 items-center dark:bg-slate-800 dark:border dark:border-slate-500">
      {currentDroplet.name}
      <div className="flex flex-row space-x-2 items-center">
        {isSaveClicked && <p className="text-slate-400">Saved!</p>}
        {isRemoveClicked && <p className="text-slate-400">Removed!</p>}

        <div className="dark:bg-slate-50 p-3 rounded-md">
          <MUIDateTimePicker
            onChange={handleInputChange}
            date={dueDate}
          ></MUIDateTimePicker>
        </div>
        <div className="flex flex-col gap-2">
          <Button
            onClick={() => {
              handleSaveDate();
            }}
            name="Save Due Date"
            className="bg-sky-500 hover:bg-sky-600 dark:bg-sky-500 w-12 h-8 dark:hover:bg-sky-600 dark:text-white dark:border dark:border-white"
            disabled={!dueDate}
          >
            <Check />
          </Button>
          <div>
            <Button
              onClick={() => setRemovePopupVisible(true)}
              name="Delete Due Date"
              className="bg-red-500 hover:bg-red-700 dark:bg-red-600 w-12 h-8 dark:hover:bg-red-700 dark:text-white dark:border dark:border-white"
              disabled={!dueDate}
            >
              <Trash2Icon />
            </Button>
          </div>
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
                  className="bg-red-500 hover:bg-red-700 dark:bg-red-600 dark:text-white dark:border dark:border-white"
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
