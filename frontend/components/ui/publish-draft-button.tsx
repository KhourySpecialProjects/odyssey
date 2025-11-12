"use client";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { publishDraftToOriginal } from "@/lib/requests/droplet";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function PublishDraftButton({
  draftDropletId,
  originalDropletId,
}: {
  draftDropletId: number;
  originalDropletId: number;
}) {
  const [isPublishing, setIsPublishing] = useState(false);
  const router = useRouter();

  const handlePublish = async () => {
    setIsPublishing(true);
    
    try {
      const result = await publishDraftToOriginal(draftDropletId, originalDropletId);

      if (!result.ok) {
        throw new Error(result.error || 'Failed to publish draft');
      }
      
      // Navigate to the published droplet
      router.push(`/d/${result.slug}`);
    } catch (error) {
      console.error('Error publishing draft:', error);
      alert('Failed to publish draft. Please try again.');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button disabled={isPublishing}>
          {isPublishing ? 'Publishing...' : 'Publish Changes'}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Publish Draft Changes</AlertDialogTitle>
          <AlertDialogDescription>
            This will replace the published droplet with your draft changes. 
            The current published version will be permanently overwritten, and this draft will be deleted.
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPublishing}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handlePublish} disabled={isPublishing}>
            {isPublishing ? 'Publishing...' : 'Publish'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}