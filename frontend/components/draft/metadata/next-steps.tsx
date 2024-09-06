'use client';

import { useState, useCallback } from 'react';
import { NextStepsInput, NextStep } from '@/components/draft/metadata/next-steps-input';
import { useDropletUpdate } from './hooks/useDropletUpdate';

export function NextSteps({ dropletId, initial} : { dropletId: number, initial: NextStep[] }) {
    const [nextSteps, setNextSteps] = useState(initial);
    const { error, handleChange } = useDropletUpdate(dropletId)


    const updateNextSteps = ( nextSteps: NextStep[]) => {
        setNextSteps(nextSteps);
        handleChange({nextSteps: nextSteps});
    }


    return (
        <>
            <NextStepsInput nextSteps={nextSteps} setNextSteps={updateNextSteps} />
            {error && <div className="text-red-500 mt-2">{error}</div>}
        </>
    );
}