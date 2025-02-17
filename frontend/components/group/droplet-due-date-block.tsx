import { Droplet, AuthorizedUser, Group } from "@/types";
import { DateTimePicker } from 'react-datetime-picker';

interface DropletDueDateBlockProps {
    currentUser: AuthorizedUser;
    existingGroup?: Group | null;
    currentDroplet: Droplet;
}

export function DropletDueDateBlock({
    currentUser,
    existingGroup,
    currentDroplet
}: DropletDueDateBlockProps) {


    return (
        <div className="flex flex-col space-y-2">
        <DateTimePicker 
          className="p-2 border border-slate-200 rounded"
          format="y-MM-dd HH:mm"
          disableClock={true}
          clearIcon={null}
          calendarIcon={null}
        />
      </div>
    )



}