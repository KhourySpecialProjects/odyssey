'use client';

import { Textarea } from '@/components/ui/textarea'
import { useState } from 'react';
import { useDropletUpdate } from './hooks/useDropletUpdate';
import Tiptap from '@/components/ui/tiptap';
import { htmlToText } from '@/lib/utils';

export function Description({ dropletId, initialContent } : { dropletId: number, initialContent: string }) {
    const [description, setDescription] = useState(initialContent);
    const { error, handleChange } = useDropletUpdate(dropletId );

    

    const updateDescription = async (description: string) => {
        const descriptionText = htmlToText(description);
        setDescription(descriptionText);
        handleChange({description: descriptionText});
    }

    

    return (
        <div>
            <Tiptap initialContent={initialContent} updateContent={updateDescription} variant="droplet-description"/>
            {error && <div className="text-red-500 mt-2">{error}</div>}
        </div>
    )

}