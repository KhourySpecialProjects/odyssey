import { GradientBackground } from "@/components/gradient-bg";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getDropletBySlug } from "@/lib/requests/droplet";
import { uppercaseFirstChar } from "@/lib/utils";
import { Droplet } from "@/types";
import { ArrowRightIcon, BookTextIcon } from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

type Props = {
  params: {
    slug: string;
  };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const droplet = await getDropletBySlug<Pick<Droplet, "name">>(params.slug, {
    fields: ["name"],
    populate: undefined,
  });
  if (!droplet) return {};

  return {
    title: `Overview | ${droplet.name}`,
  };
}

export default async function DropletRoute({ params }: Props) {
  const droplet = await getDropletBySlug<Droplet>(params.slug, {
    fields: ["*"],
    populate: {
      authors: {
        populate: "*",
      },
      lessons: {
        populate: "*",
      },
      tags: {
        populate: "*",
      },
    },
  });
  console.log(droplet.authors[0].photo);
  if (!droplet) return notFound();

  return (
    <>
      <GradientBackground>
        <div className="max-w-2xl mx-auto">
          <div className="flex flex-row flex-0 gap-1.5">
            <Badge size="lg" variant="outline">
              {uppercaseFirstChar(droplet.focusArea)}
            </Badge>
            <Badge size="lg" variant="outline">
              {uppercaseFirstChar(droplet.type)}
            </Badge>
            {droplet.tags?.map((tag) => (
              <Badge key={tag.id} size="lg" variant="outline">
                {tag.name}
              </Badge>
            ))}
          </div>
          <h1 className="mt-3 text-6xl font-black text-slate-900">
            {droplet.name}
          </h1>
          {droplet.description ? (
            <p className="mt-3 text-slate-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-slate-400">
              {droplet.description}
            </p>
          ) : null}
        </div>
      </GradientBackground>

      <div className="w-full max-w-2xl py-8 mx-auto">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            What&rsquo;s Inside
          </h2>
          <p className="text-slate-500">
            This Droplet contains the following lessons:
          </p>

          {droplet.lessons && droplet.lessons.length > 0 ? (
            <div className="mt-4 rounded-md bg-slate-100">
              <ul className="flex flex-col mt-2 divide-y divide-slate-200">
                {droplet.lessons.map((lesson) => (
                  <li
                    key={lesson.id}
                    className="inline-flex items-center [&:not(:first-child)]:pt-3 rounded-md py-2 px-4 gap-2"
                  >
                    <BookTextIcon className="w-5 h-5 mr-0.5" />
                    {lesson.name}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="p-4 mt-2 rounded-md bg-slate-100">
              This Droplet does not have any lessons yet. Check back soon!
            </div>
          )}
        </div>

        <div className="mt-8 md:mt-12">
          <h2 className="text-2xl font-bold text-slate-900">
            About the Authors
          </h2>
          <p className="text-slate-500">
            This Droplet was written by the following individuals:
          </p>

          <ul className="flex flex-col mt-4 divide-y rounded-md bg-slate-100 divide-slate-200">
            {droplet.authors.map((author) => (
              <li
                key={author.id}
                className="inline-flex [&:not(:first-child)]:pt-3 rounded-md p-4 gap-4"
              >
                <Avatar variant="round" className="border border-sky-800">
                  <AvatarImage src={author.photo?.formats?.medium.url} />
                  <AvatarFallback>{author.name.charAt(0)}</AvatarFallback>
                </Avatar>

                <div>
                  <span className="font-bold leading-relaxed">
                    {author.name}
                  </span>

                  <p className="text-sm text-slate-600">{author.bio}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {droplet.lessons && droplet.lessons.length > 0 ? (
          <div className="mt-8 md:mt-12">
            <Button size="lg" after={<ArrowRightIcon />} asChild>
              <Link href={`/d/${droplet.slug}/${droplet.lessons[0].slug}`}>
                Begin Droplet
              </Link>
            </Button>
          </div>
        ) : null}
      </div>
    </>
  );
}
