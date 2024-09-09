'use client';

import { Button } from '@/components/ui/button';
import { useFormStatus } from 'react-dom';
import { LoaderIcon, CornerDownLeft } from 'lucide-react';

export function DeleteButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" size="sm" variant="destructive">
            {pending ? <LoaderIcon className='animate-spin'/> : 'Delete'}
        </Button>
    );
}

export function AddButton() {
    const { pending } = useFormStatus();

    return (
        <Button size="sm" >{ pending ? <LoaderIcon className="animate-spin"/> : <CornerDownLeft/> }</Button>
    )
    
}   