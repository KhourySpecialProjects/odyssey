'use client';

import { DROPLET_FILTERS } from "@/lib/globals";
import { Select, SelectGroup, SelectLabel, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useState, useCallback } from 'react';
import { debounce } from 'lodash';
import { updateDroplet } from '@/lib/actions';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
//import * as ToggleGroup from '@radix-ui/react-toggle-group';

export function Filters( { dropletId, initialFocusArea, initialType }: { dropletId: number, initialFocusArea: string, initialType: string, } ) {

    //for all purposes, focusArea is the first element in any list that is used to combine focus area and droplet type
    const [focusArea, setFocusArea] = useState(initialFocusArea);
    const [type, setType] = useState(initialType)
    const [error, setError] = useState(["", ""]);

    const updateValueBackend = async (data: {focusArea: string} | {type: string}) => {
        const response = await updateDroplet(dropletId, data);

        if (response.error) {
            if ("focusArea" in data) {
                let newError = [...error]
                newError[0] = "Error updating focus area"
                setError(newError);
            } else {
                let newError = [...error]
                newError[1] = "Error updating type"
                setError(newError);
            }
            
        }
    }

    const updateFocusArea =( value: string ) => {
        setFocusArea(value);
        debounceUpdateValue({focusArea: value})
    }

    const updateType = (value: string) => {
        setType(value);
        debounceUpdateValue({type: value})
    }

    //used in iteration of DROPLET_FILTERS
    const values = [focusArea, type];
    const updateValues = [updateFocusArea, updateType];

    const debounceUpdateValue = useCallback(debounce(updateValueBackend, 1000), []);
    return (
        <>
            {DROPLET_FILTERS.map((filter, index) => (
                <div  key={index}> 
                    <Select
                    key={filter.name}
                    name={filter.name}
                    value={values[index]}
                    onValueChange={updateValues[index]}
                    >
                        <SelectGroup className="flex flex-col items-start">
                            <SelectLabel className="pl-0 pb-2">{filter.label}</SelectLabel>
                            <SelectTrigger className="w-56">
                                <SelectValue />
                            </SelectTrigger>
                        </SelectGroup>

                
                        <SelectContent>
                            {filter.options.map((option) => (
                            <SelectItem value={option.value} key={option.value}>
                                {option.label}
                            </SelectItem>
                            ))}

                        </SelectContent>
                    </Select>
                    {error[index] && <div key={index} className="text-red-500 mt-2">{error[index]}</div>}
                </div>
                
                
            ))}

            <ToggleGroup type="single">
                <ToggleGroupItem value="center">
                    Professional
                </ToggleGroupItem>
                <ToggleGroupItem value="left">
                    Technical
                </ToggleGroupItem>
                <ToggleGroupItem value="right">
                    Personal
                </ToggleGroupItem>

            </ToggleGroup>
            
            
            

            
          </>
    );

}