'use client';

import { useState } from 'react';
import { Resource } from '@/types';
import { Input} from '@/components/ui/input';

export type NextStep = Omit<Resource, "id">;

export function NextStepsInput({ nextSteps, setNextSteps } : { nextSteps: NextStep[], setNextSteps: (nextSteps: NextStep[]) => void }) {
    const [label, setLabel] = useState("");
    const [url, setUrl] = useState("");

    console.log(nextSteps);

    const addNextStep = () => {
        
        if (url) {
            setNextSteps([...nextSteps, {label, url}]); 
            setLabel("");
            setUrl("");
        } else {
            alert("URL required");
        }
    }

    const removeNextStep = (index: number) => {
        setNextSteps(nextSteps.filter((_, i) => i !== index)); 
    }

    return (
        <div>
            <div className="text-sm font-bold pb-2">Next Steps</div>
            <div className="flex gap-2">
                <Input type="text" value={label} onChange={(e) => setLabel(e.currentTarget.value)} placeholder="Label" className="w-32"/>
                <Input type="text" value={url} onChange={(e) => {
                    setUrl(e.currentTarget.value);
                 }} placeholder="URL" className="w-32 outline-none border rounded-md"/>
                <button onClick={addNextStep} className="btn">Add</button>
            </div>
            <div className="mt-2">
                {nextSteps.map((step, index) => (
                    <div key={index} className="w-56 flex justify-between items-center">
                        <a href={step.url}  className="text-blue-500 underline">{step.label !== "" ? step.label : step.url}</a>
                        <button onClick={() => removeNextStep(index)} className="text-red-500">Remove</button>
                    </div>
                ))}
            </div>
        </div>
    );

}