import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getDropletBySlug } from "@/lib/droplets";
import { flattenAttributes } from "@/lib/utils";
import { ArrowRightIcon } from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

type Props = {
  params: {
    slug: string;
  };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  let droplet = await getDropletBySlug(params.slug, {
    authors: "*",
    lessons: {
      populate: "*",
    },
  });
  if (droplet.data.length === 0) return {};
  droplet = flattenAttributes(droplet)[0];

  return {
    title: `Overview | ${droplet.name}`,
  };
}

export default async function DropletRoute({ params }: Props) {
  let droplet = await getDropletBySlug(params.slug, {
    authors: {
      populate: "*",
    },
    lessons: {
      populate: "*",
    },
  });
  if (droplet.data.length === 0) return notFound();
  droplet = flattenAttributes(droplet)[0];

  return (
    <div className="w-full max-w-prose py-8 mx-auto">
      <h1 className="mb-2 text-4xl font-bold">{droplet.name}</h1>
      <p>
        This is a <strong>{droplet.type}</strong> Droplet.
      </p>

      <h2 className="mt-4 font-bold">Authors:</h2>
      <div className="flex flex-row gap-2 mt-2">
        {droplet.authors.map((author: any) => (
          <div key={author.id} className="flex-1 p-4 rounded-md bg-slate-100">
            {author.photo ? (
              <div className="mb-2">
                <Avatar className="border border-slate-200 rounded-md">
                  <AvatarImage src={author.photo.formats.medium.url} />
                  <AvatarFallback>{author.name.charAt(0)}</AvatarFallback>
                </Avatar>
              </div>
            ) : null}

            <p className="text-lg font-bold">{author.name}</p>
            <p className="mt-1 text-sm text-slate-700">
              {author.bio || <em>No bio available.</em>}
            </p>
          </div>
        ))}
      </div>

      <div className="h-8"></div>

      {droplet.lessons.length > 0 ? (
        <>
          <h2 className="font-bold">Contents:</h2>
          <div className="rounded-md bg-slate-100">
            <ul className="flex flex-col mt-2 divide-y divide-slate-200">
              {droplet.lessons.map((lesson: any, i: number) => (
                <li
                  key={i}
                  className="inline-flex items-center [&:not(:first-child)]:pt-3 rounded-md py-2 px-4 gap-2"
                >
                  {lesson.title}
                </li>
              ))}
            </ul>
          </div>

          <div className="h-8"></div>

          <Button after={<ArrowRightIcon />} asChild>
            <Link href={`/d/${droplet.slug}/${droplet.lessons[0].slug}`}>
              Begin Droplet
            </Link>
          </Button>
        </>
      ) : (
        <div className="p-4 rounded-md bg-slate-100">
          This Droplet does not have any lessons. Check back soon!
        </div>
      )}
    </div>
  );
}
