'use client';

import { Droplet } from "@/types";
import { debounce } from 'lodash';
import { useState, useCallback } from 'react';
import { MultiSelect, MultiSelectItem } from '@/components/new/multi-select';
import { updateDroplet } from '@/lib/actions';
import { useDropletUpdate } from './hooks/useDropletUpdate';

export function Requisites({ dropletId, droplets, selectedDroplets, prerequisite = false} : {dropletId: number, droplets: Droplet[], selectedDroplets: Droplet[], prerequisite?: boolean}) {
    const initArr : MultiSelectItem[] = selectedDroplets.map((droplet) => ({id : droplet.id, name: droplet.name} as MultiSelectItem));
    const [selected, setSelected] = useState<MultiSelectItem[]>(initArr);
    const { error, handleChange } = useDropletUpdate(dropletId);
    

    const update = (selected: MultiSelectItem[]) => {
        setSelected(selected);
        const ids = selected.map((item) => item.id);
        if (prerequisite) {
            handleChange({prerequisiteIds: ids});
        } else {
            handleChange({postrequisiteIds: ids});
        }
        
    }

    return (
        <>
            <MultiSelect label={prerequisite ? "Prerequisites" : "Postrequisites"} items={droplets as MultiSelectItem[]} selected={selected} setSelected={update} align="start"/>
            {error && <div className="text-red-500 mt-2">{error}</div>}
        </>
        
    );

}