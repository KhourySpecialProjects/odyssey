import { Badge } from "@/components/ui/badge";
import { uppercaseFirstChar } from "@/lib/utils";
import { Droplet } from "@/types";
import Link from "next/link";

export function DropletTile({ droplet }: { droplet: Droplet }) {
  return (
    <li className="transition-colors border rounded-md bg-slate-50 border-slate-200 hover:border-slate-300">
      <Link
        className="relative inline-flex w-full h-full p-6"
        href={`/d/${droplet.slug}`}
      >
        <div className="flex flex-col justify-end gap-3">
          <div className="flex flex-row flex-wrap flex-0 gap-1.5">
            <Badge variant="outline">
              {uppercaseFirstChar(droplet.focusArea)}
            </Badge>
            <Badge variant="outline">{uppercaseFirstChar(droplet.type)}</Badge>
            {droplet.tags?.map((tag) => (
              <Badge key={tag.id} variant="outline">
                {tag.name}
              </Badge>
            ))}
          </div>

          <span className="block w-full text-3xl font-black text-slate-950 place-self-end">
            {droplet.name}
          </span>
        </div>
      </Link>
    </li>
  );
}
