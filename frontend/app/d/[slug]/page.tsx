import { getDropletBySlug } from "@/lib/droplets";
import { flattenAttributes } from "@/lib/utils";
import { Button } from "@lemonsqueezy/wedges";
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
    title: {
      absolute: `Overview | ${droplet.name}`,
      template: `%s | ${droplet.name}`,
    },
  };
}

export default async function DropletRoute({ params }: Props) {
  let droplet = await getDropletBySlug(params.slug, {
    authors: "*",
    lessons: {
      populate: "*",
    },
  });
  if (droplet.data.length === 0) return notFound();
  droplet = flattenAttributes(droplet)[0];

  return (
    <div className="w-full max-w-5xl p-8 mx-auto">
      <h1 className="text-4xl font-bold">{droplet.name}</h1>
      <p>
        This is a <strong>{droplet.type}</strong> Droplet.
      </p>

      <h2 className="mt-4 font-bold">Authors:</h2>
      <div className="flex flex-row gap-2 mt-2">
        {droplet.authors.map((author: any) => (
          <div key={author.id} className="flex-1 p-4 rounded-md bg-slate-100">
            <p className="font-medium">{author.name}</p>
            <p className="text-sm">
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

          <Button after={<ArrowRightIcon className="w-4" />} asChild>
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
