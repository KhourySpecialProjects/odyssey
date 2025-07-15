import { GradientBackground } from "@/components/gradient-bg";
import {
  BinaryIcon,
  BrainIcon,
  BriefcaseIcon,
  TargetIcon,
  UserIcon,
} from "lucide-react";
import { Metadata } from "next";
import { StaggeredGallery } from "@/components/ui/staggered-gallery";

export const metadata: Metadata = {
  title: "About",
};

const types = [
  {
    name: "Knowledge",
    description:
      "A Knowledge Droplet provides a comprehensive overview of a specific topic. While completing it, students will evaluate their grasp on the material by responding to check-in questions throughout.",
    icon: BrainIcon,
  },
  {
    name: "Skill",
    description:
      "A Skill Droplet applies student knowledge through guided examples for use in some application. Students will reinforce their understanding through hands-on exposure via guided walkthroughs and DIY activities.",
    icon: TargetIcon,
  },
];

const focusAreas = [
  {
    name: "Personal",
    description:
      "Personal impact Droplets introduce topics related to the Khoury College and Northeastern student experience, as well as tips for constructing mental fortitude. Real student experiences may be included.",
    icon: UserIcon,
  },
  {
    name: "Professional",
    description:
      "Professional impact Droplets advance critical thinking skills used in the workforce along with business best practices.",
    icon: BriefcaseIcon,
  },
  {
    name: "Technical",
    description:
      "Technical impact Droplets leverage technology as a driver for innovation through exposure to recent advances, hands-on development, and fundamental industry knowledge.",
    icon: BinaryIcon,
  },
];

export default async function AboutPage() {
  return (
    <GradientBackground>
      <>
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            About Odyssey
          </h1>
          <p className="mt-4 text-lg leading-normal text-balance text-slate-600 dark:text-slate-300">
            Odyssey is an all-new on-demand learning platform built by Khoury
            College, for Khoury College.
          </p>
        </div>

        <div className="mx-auto mt-24 max-w-7xl px-6 lg:px-8">
          <div className="mx-auto grid max-w-2xl grid-cols-1 gap-x-8 gap-y-16 sm:gap-y-20 lg:mx-0 lg:max-w-none lg:grid-cols-2">
            <div className="lg:pt-4 lg:pr-8">
              <div className="lg:max-w-lg">
                <h2 className="text-base leading-7 font-semibold text-sky-600">
                  Types
                </h2>
                <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
                  Understand{" "}
                  <span className="px-1.5 font-mono text-sky-600 italic underline underline-offset-1">
                    how
                  </span>{" "}
                  you&rsquo;ll learn
                </p>
                <p className="mt-6 text-lg leading-8 text-slate-600 dark:text-slate-300">
                  Droplets are categorized based on the types of content they
                  include and their estimated completion time, so that you know
                  what to expect and how to make the most of your odyssey.
                </p>
              </div>
            </div>

            <dl className="max-w-xl space-y-4 text-base leading-7 text-slate-600 lg:max-w-none">
              {types.map((type) => (
                <div
                  key={type.name.toLowerCase()}
                  className="light:border-transparent rounded-md border bg-sky-50 p-5 transition-colors hover:border-sky-600 dark:border-slate-500 dark:bg-slate-800"
                >
                  <dt className="flex flex-row items-center gap-3">
                    <type.icon
                      className="h-6 w-6 text-sky-600"
                      aria-hidden="true"
                    />
                    <span className="text-lg font-semibold text-slate-900 dark:text-slate-300">
                      {type.name} Droplets
                    </span>
                  </dt>
                  <dd className="mt-1 ml-9 dark:text-slate-400">
                    {type.description}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <div className="mx-auto mt-24 max-w-7xl px-6 lg:px-8">
          <div className="mx-auto grid max-w-2xl grid-cols-1 gap-x-8 gap-y-16 sm:gap-y-20 lg:mx-0 lg:max-w-none lg:grid-cols-2">
            <div className="lg:pt-4 lg:pr-8">
              <div className="lg:max-w-lg">
                <h2 className="text-base leading-7 font-semibold text-sky-600">
                  Focus Areas
                </h2>
                <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
                  Understand{" "}
                  <span className="px-1.5 font-mono text-sky-600 italic underline underline-offset-1">
                    what
                  </span>{" "}
                  you&rsquo;ll learn
                </p>
                <p className="mt-6 text-lg leading-8 text-slate-600 dark:text-slate-300">
                  Odyssey has collections of Droplets across a number of focus
                  areas to hone in on various student aspects.
                </p>
              </div>
            </div>

            <dl className="max-w-xl space-y-4 text-base leading-7 text-slate-600 lg:max-w-none">
              {focusAreas.map((type) => (
                <div
                  key={type.name.toLowerCase()}
                  className="light:border-transparent rounded-md border bg-sky-50 p-5 transition-colors hover:border-sky-600 dark:border-slate-500 dark:bg-slate-800"
                >
                  <dt className="flex flex-row items-center gap-3">
                    <type.icon
                      className="h-6 w-6 text-sky-600"
                      aria-hidden="true"
                    />
                    <span className="text-lg font-semibold text-slate-900 dark:text-slate-300">
                      {type.name} Droplets
                    </span>
                  </dt>
                  <dd className="mt-1 ml-9 dark:text-slate-400">
                    {type.description}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </>
      <StaggeredGallery
        title={"Features"}
        descriptions={[
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse suscipit dictum nisi sed convallis. Duis imperdiet augue eget felis finibus, venenatis dictum orci molestie. Cras porta odio eu metus pretium pharetra. Cras velit mauris, volutpat non tristique sed, posuere id nisi. Cras urna nulla, interdum ac accumsan volutpat, feugiat ut ex. Donec quis tincidunt ex. Integer nisl magna, rhoncus id consequat eget, convallis id risus. Mauris sodales, odio non ultricies pretium, diam eros tempor nunc, non euismod urna felis sed erat. Etiam pharetra nunc a nisi molestie vestibulum.",
          "In molestie lectus a libero iaculis aliquam. Aliquam erat volutpat. Aliquam suscipit fermentum nisi, auctor lobortis massa condimentum quis. Aliquam quis dui purus. Suspendisse nec lorem eu risus facilisis commodo ultrices ac magna. Curabitur sagittis ex ut ligula dapibus tempor. Integer hendrerit, neque eu vulputate commodo, mauris nibh commodo sapien, eu mattis felis libero in tellus.",
          "Aliquam non tortor elit. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; Sed enim tortor, tristique et pellentesque quis, malesuada semper urna. Aenean tortor nibh, consectetur in condimentum ac, varius eu sem. Sed at fringilla orci, eget eleifend ligula. Donec vitae sollicitudin nisl, elementum sagittis urna. Etiam in semper justo. Nam quis justo diam. Ut metus nisi, viverra at aliquet non, euismod accumsan mauris. Vivamus eros risus, aliquet in molestie et, efficitur sed risus. Phasellus finibus erat sit amet condimentum aliquet. Maecenas pretium non urna ac laoreet.",
          "Ut eu mauris lacus. Nulla vel augue molestie, viverra eros vitae, bibendum sem. Duis in gravida ex, a convallis quam. Quisque et gravida diam. Praesent condimentum tristique dui, elementum malesuada sapien vehicula vel. Donec turpis neque, rhoncus sit amet ante eget, egestas tristique erat. Duis augue purus, semper vitae urna volutpat, bibendum luctus lectus. In sit amet urna a libero varius pharetra. Ut eu consequat purus. Morbi a risus volutpat, fermentum lectus ac, tempus diam. Proin fermentum rutrum sagittis. Sed dignissim libero et sem bibendum pellentesque. Donec massa ligula, bibendum eget elit ac, ultricies posuere libero. Ut sagittis purus sit amet volutpat elementum."
        ]}
        images={[
          [
            "https://odyssey-dev-bucket.s3.us-east-2.amazonaws.com/uploads/6ff74620-28c1-4920-bd6b-5083c60a59ca-blob",
            "https://odyssey-dev-bucket.s3.us-east-2.amazonaws.com/uploads/7b49a516-c88d-433c-9057-67e91e323130-blob",
            "https://www.pokemon.com/static-assets/content-assets/cms2/img/pokedex/detail/012.png"
          ],
          [
            "https://images.unsplash.com/photo-1503023345310-bd7c1de61c7d",
            "https://images.unsplash.com/photo-1498050108023-c5249f4df085",
            "https://images.unsplash.com/photo-1603791440384-56cd371ee9a7"
          ],
          [
            "https://www.pokemon.com/static-assets/content-assets/cms2/img/pokedex/detail/025.png",
            "https://www.pokemon.com/static-assets/content-assets/cms2/img/pokedex/detail/443.png",
            "https://www.pokemon.com/static-assets/content-assets/cms2/img/pokedex/detail/104.png" 
          ],
          [
            "https://www.pokemon.com/static-assets/content-assets/cms2/img/pokedex/detail/466.png",
            "https://images.unsplash.com/photo-1518770660439-4636190af475", 
            "https://images.unsplash.com/photo-1593642634367-d91a135587b5"
          ]
        ]}
      />

    </GradientBackground>
  );
}
