import { getVoyageBySlug } from "@/lib/requests/voyage";
import { notFound } from "next/navigation";
import { VoyageMap } from "@/components/voyages/voyage-map";
import { VoyagePlaylist } from "@/types";

type Props = {
  params: Promise<Params>;
};

type Params = {
  slug: string;
};

export default async function VoyagePage({ params }: Props) {
  const p = await params;
  const voyage = await getVoyageBySlug(p.slug);

  if (!voyage) {
    notFound();
  }

  // Sort voyage_playlists by orderIndex and extract playlist data
  const orderedPlaylists = (voyage.voyage_playlists || [])
    .slice()
    .sort((a: VoyagePlaylist, b: VoyagePlaylist) => a.orderIndex - b.orderIndex)
    .map((vp: VoyagePlaylist) => {
      const playlist = vp.playlist;
      const dropletCount = playlist?.droplets?.length ?? 0;
      return {
        id: playlist?.id ?? vp.id,
        name: playlist?.name ?? "",
        slug: playlist?.slug ?? "",
        dropletCount,
        orderIndex: vp.orderIndex,
      };
    });

  return (
    <div className="container py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 text-center">
          <h1 className="mb-3 text-4xl font-bold">{voyage.name}</h1>
          {voyage.description && (
            <p className="mx-auto max-w-2xl text-lg text-slate-600 dark:text-slate-400">
              {voyage.description}
            </p>
          )}
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {orderedPlaylists.length}{" "}
            {orderedPlaylists.length === 1 ? "island" : "islands"}
          </p>
        </div>

        <VoyageMap playlists={orderedPlaylists} />
      </div>
    </div>
  );
}
