"use client";

import useDebugStore from "@/stores/debug-store";
import { BlocksRenderer } from "@strapi/blocks-react-renderer";

export function DropletRenderer({ droplet }: any) {
  const isDebugEnabled = useDebugStore((state) => state.debug);

  return (
    <div className="w-full max-w-5xl p-8 mx-auto">
      <h1 className="text-4xl font-bold">{droplet.name}</h1>
      <p>
        This is a <strong>{droplet.type}</strong> Droplet.
      </p>

      <h2 className="mt-4 font-bold">Authors:</h2>
      <div className="mt-2 flex flex-row gap-2">
        {droplet.authors.map((author: any) => (
          <div key={author.id} className="flex-1 p-4 bg-slate-100 rounded-md">
            <p className="font-medium">{author.name}</p>
            <p className="text-sm">
              {author.bio || <em>No bio available.</em>}
            </p>
          </div>
        ))}
      </div>

      <hr className="mt-4 mb-8" />

      <div className="prose">
        <BlocksRenderer content={droplet.content} />
      </div>

      {isDebugEnabled ? (
        <pre className="mt-4 p-4 text-sm break-words whitespace-pre rounded-md bg-slate-100 text-wrap">
          {JSON.stringify(droplet, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}
