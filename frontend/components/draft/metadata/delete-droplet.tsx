'use client';

import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ArrowLeftIcon, Trash2Icon } from 'lucide-react';
import { deepDeleteDroplet } from '@/lib/actions';
import { useRouter } from 'next/navigation';

export function DeleteDropletButton({dropletId}: {dropletId: number}) {
    const router = useRouter();

    const deleteDroplet = async () => {
        const response = await deepDeleteDroplet(dropletId);
        if (response.ok && !response.error) {
            router.replace(`/drafts`);
        }

    }

    return (
        <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive">Delete Droplet</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
            <DialogTitle>Delete Droplet</DialogTitle>
          
          <DialogDescription className="my-4 text-lg text-black flex flex-col items-center justify-center">
            <p>Are you sure you want to delete this Droplet?</p>
            <p>This action <span className="font-extrabold">cannot</span> be undone.</p>
            <p>This will also delete all lessons associated with this droplet.</p>
          </DialogDescription>
          <div className="flex flex-row items-center justify-center space-x-4">
            <DialogClose>
                <Button before={<ArrowLeftIcon/>}  variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={deleteDroplet} variant="destructive" after={<Trash2Icon/>}>Delete</Button>
            </div>
        </DialogHeader>

        
      </DialogContent>
    </Dialog>
    )

}