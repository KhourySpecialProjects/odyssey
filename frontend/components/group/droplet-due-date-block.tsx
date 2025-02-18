import { Droplet, AuthorizedUser, Group } from "@/types";
import { DateTimePicker } from 'react-datetime-picker';
import { ChangeEvent } from "react";
import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { assignDueDate, getDueDate } from "@/lib/requests/groups";

interface DropletDueDateBlockProps {
  currentUser: AuthorizedUser;
  existingGroup: Group;
  currentDroplet: Droplet;
  //curDueDate: Date;
}

export function DropletDueDateBlock({
  currentUser,
  existingGroup,
  currentDroplet,
  //curDueDate,
}: DropletDueDateBlockProps) {

  const [dueDate, setDueDate] = useState<Date>(new Date());


  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
      const inputDueDate = e.target.value;

      setDueDate(new Date(inputDueDate))

      console.log("due date is ", dueDate)
    };

    const handleSaveDate = () => {
      const handleSaveDate = async () => {
        await assignDueDate(existingGroup, currentDroplet, dueDate)
      }
      handleSaveDate();
    }
  


  return (
    <div className="flex flex-row justify-between space-x-2 w-full bg-slate-50 border border-slate-200 rounded-lg p-4 items-center">
      {currentDroplet.name}
      <div className="space-x-2">
        <input 
          aria-label="Date and time" 
          type="datetime-local"
          onChange={(e) => handleInputChange(e)} />
        <Button onClick={handleSaveDate}>Save</Button>
      </div>
    </div>
  )



}