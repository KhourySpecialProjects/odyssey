'use client';

import { Input } from '../../ui/input';
import { useState} from 'react';
import { Label } from '../../ui/label';
import { useDropletUpdate } from './hooks/useDropletUpdate';
import Tiptap  from '../../ui/tiptap';



export function DropletName({ startingName, dropletId } : { startingName: string, dropletId: number }) {
    const [name, setName] = useState(startingName);
    const { error, handleChange } = useDropletUpdate(dropletId);

    

    const updateName = (htmlName : string) => {
        const name = htmlName.replace(/<[^>]*>?/gm, '').replace("&nbsp;", " ").trim();
        setName(name);
        handleChange({name: name});
    }

    

    

    return (
        <>
            <Label htmlFor='name' className='font-bold pb-4' hidden>Droplet Name</Label>
            <Tiptap updateContent={updateName} initialContent={`<h1>${name}</h1>`} variant="droplet-name"/>
            
            {error && <div className="text-red-500 mt-2">{error}</div>}
        </>
        
    );
}