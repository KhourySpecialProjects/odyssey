import { useState, useEffect, useRef } from 'react';
import { GoalIcon, LoaderIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils'
import { set } from 'lodash';
import { useFormStatus } from 'react-dom';

export function LearningObjectiveDisplay({ objective, update, remove} : { objective: string, update: (objective: string) => void, remove : () => void }) {
    const [editing, setEditing] = useState(false);
    const [learningObjective, setLearningObjective] = useState(objective);
    const ref = useRef<HTMLLIElement>(null);

    const handleClickOutside = (event: any) => {
        if (ref.current && !ref.current.contains(event.target)) {
            setEditing(false); // Action to perform when clicking outside
        }
    }


    useEffect(() => {
        // Add event listener for clicks outside
        document.addEventListener('mousedown', handleClickOutside);
        
        return () => {
          // Cleanup event listener on unmount
          document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    

    
    
    
    return (
        
        <li
            className={cn("inline-flex items-center gap-2 px-4 py-3 leading-snug", (editing ? "shadow-md" : "hover:shadow cursor-pointer"))}
            onClick={() => (editing ? null : setEditing(true))}
            ref={ref}>
            <GoalIcon className="w-5 h-5 mr-0.5 shrink-0" />
            
            {editing ? 
            <div className="w-full inline-flex items-center justify-between space-x-1.5">
                <Input value={learningObjective} onChange={(e) => {
                    setLearningObjective(e.target.value);
                    update(e.target.value);
                    }}/>
                <form action={remove}>
                    <DeleteObjectiveButton/>
                </form>
            </div> : 
            learningObjective}
        </li>
    );
}

function DeleteObjectiveButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" size="sm" variant="destructive">
            {pending ? <LoaderIcon className='animate-spin'/> : 'Delete'}
        </Button>
    );
}