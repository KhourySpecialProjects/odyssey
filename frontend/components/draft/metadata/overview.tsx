'use client';

import TipTap from '../../ui/tiptap';
import { debounce } from 'lodash';
import { useDropletUpdate } from './hooks/useDropletUpdate';

export function Overview({ dropletId, initialContent } : { dropletId: number, initialContent: string }) {

    const { error, handleChange } = useDropletUpdate(dropletId);

    return (
        
       
            

        <section className="w-full max-w-2xl">
            <h2 className="text-2xl font-bold text-slate-900">Overview</h2>
            <TipTap updateContent={(content) => handleChange({overview: content})} initialContent={initialContent} variant="droplet-overview"/>
            {error && <div className="text-red-500 mt-2">{error}</div>}
        </section>

        
    )
}