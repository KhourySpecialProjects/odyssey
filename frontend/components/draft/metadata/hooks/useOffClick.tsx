'use client';

import { useEffect, useState } from 'react';

export function useOffClick(ref: React.RefObject<HTMLElement>) {
    const [open, setOpen] = useState(false);

    const handleClickOutside = (event: any) => {
        if (ref.current && !ref.current.contains(event.target)) {
            setOpen(false); // Action to perform when clicking outside
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

    return { open, setOpen };

}