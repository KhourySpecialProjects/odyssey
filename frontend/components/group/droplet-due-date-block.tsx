import { Droplet, Group } from "@/types";
import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { assignDropletDueDate, getGroupDueDate } from "@/lib/requests/groups";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";

import MUIDateTimePicker from "./datetime-picker";
import { DateTime } from "luxon";
import { Check, Trash2Icon } from "lucide-react";
import Link from "next/link";

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
    <div className="flex w-full flex-row items-center justify-between space-x-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-xl dark:border dark:border-slate-500 dark:bg-slate-800">
      <Link href={`/d/${currentDroplet.slug}`}>{currentDroplet.name}</Link>
      <div className="flex flex-row items-center space-x-2">
        {isSaveClicked && <p className="text-slate-400">Saved!</p>}
        {isRemoveClicked && <p className="text-slate-400">Removed!</p>}

        <div className="rounded-md dark:bg-slate-50">
          <MUIDateTimePicker
            onChange={handleInputChange}
            date={dueDate}
            data-testid="picker"
          ></MUIDateTimePicker>
        </div>
        <div className="flex flex-col gap-2">
          <Button
            onClick={() => {
              handleSaveDate();
            }}
            name="Save Due Date"
            className="h-8 w-12 bg-sky-500 hover:bg-sky-600 dark:border dark:border-white dark:bg-sky-500 dark:text-white dark:hover:bg-sky-600"
            disabled={!dueDate}
            role="save"
          >
            <Check />
          </Button>
          <div>
            <Button
              onClick={() => setRemovePopupVisible(true)}
              name="Delete Due Date"
              className="h-8 w-12 bg-red-500 hover:bg-red-700 dark:border dark:border-white dark:bg-red-600 dark:text-white dark:hover:bg-red-700"
              disabled={!dueDate}
              role="delete"
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

              <div className="flex flex-row items-center justify-center space-x-2">
                <div className="w-1/3"></div>
                <Button
                  onClick={() => handleRemoveDate()}
                  className="bg-red-500 hover:bg-red-700 dark:border dark:border-white dark:bg-red-600 dark:text-white"
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
