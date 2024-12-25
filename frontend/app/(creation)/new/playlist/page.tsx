import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon } from "lucide-react";

export default function NewPlaylist() {
  return (
    <>
      <div className="w-full p-8 mx-auto my-4 text-center max-w-7xl">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Create New Playlist
        </h1>
        <p className="mt-4 text-lg leading-normal text-slate-600 text-balance">
          Create a new playlist to organize your content.
        </p>
      </div>

      <div className="w-full max-w-5xl px-4 mx-auto mb-8 xl:p-0">
        <div>
          <Link href="/drafts">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeftIcon /> Back to Drafts
            </Button>
          </Link>
        </div>
        
        <div className="mt-6">
          <p className="text-sm text-slate-500">New playlist creation feature coming soon!</p>
        </div>
      </div>
    </>
  );
}