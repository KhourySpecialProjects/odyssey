import { GradientBackground } from "@/components/gradient-bg";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import {
  ArrowRightIcon,
  BinaryIcon,
  BrainIcon,
  BriefcaseIcon,
  TargetIcon,
  UserIcon,
} from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";

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
  const user = await getCurrentUser();
  return (
    <GradientBackground>
      <>
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            About Odyssey
          </h1>
          <p className="mt-4 text-lg leading-normal text-slate-600 text-balance">
            Odyssey is an all-new on-demand learning platform built by Khoury
            College, for Khoury College.
          </p>
        </div>

        <div className="px-6 mx-auto mt-24 max-w-7xl lg:px-8">
          <div className="grid max-w-2xl grid-cols-1 mx-auto gap-x-8 gap-y-16 sm:gap-y-20 lg:mx-0 lg:max-w-none lg:grid-cols-2">
            <div className="lg:pr-8 lg:pt-4">
              <div className="lg:max-w-lg">
                <h2 className="text-base font-semibold leading-7 text-sky-600">
                  Types
                </h2>
                <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                  Understand{" "}
                  <span className="italic underline underline-offset-1 font-mono px-1.5 text-sky-600">
                    how
                  </span>{" "}
                  you&rsquo;ll learn
                </p>
                <p className="mt-6 text-lg leading-8 text-slate-600">
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
                  className="p-5 transition-colors border border-transparent rounded-md bg-sky-50 hover:border-sky-600"
                >
                  <dt className="flex flex-row items-center gap-3">
                    <type.icon
                      className="w-6 h-6 text-sky-600"
                      aria-hidden="true"
                    />
                    <span className="text-lg font-semibold text-slate-900">
                      {type.name} Droplets
                    </span>
                  </dt>
                  <dd className="mt-1 ml-9">{type.description}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <div className="px-6 mx-auto mt-24 max-w-7xl lg:px-8">
          <div className="grid max-w-2xl grid-cols-1 mx-auto gap-x-8 gap-y-16 sm:gap-y-20 lg:mx-0 lg:max-w-none lg:grid-cols-2">
            <div className="lg:pr-8 lg:pt-4">
              <div className="lg:max-w-lg">
                <h2 className="text-base font-semibold leading-7 text-sky-600">
                  Focus Areas
                </h2>
                <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                  Understand{" "}
                  <span className="italic underline underline-offset-1 font-mono px-1.5 text-sky-600">
                    what
                  </span>{" "}
                  you&rsquo;ll learn
                </p>
                <p className="mt-6 text-lg leading-8 text-slate-600">
                  Odyssey has collections of Droplets across a number of focus
                  areas to hone in on various student aspects.
                </p>
              </div>
            </div>

            <dl className="max-w-xl space-y-4 text-base leading-7 text-slate-600 lg:max-w-none">
              {focusAreas.map((type) => (
                <div
                  key={type.name.toLowerCase()}
                  className="p-5 transition-colors border border-transparent rounded-md bg-sky-50 hover:border-sky-600"
                >
                  <dt className="flex flex-row items-center gap-3">
                    <type.icon
                      className="w-6 h-6 text-sky-600"
                      aria-hidden="true"
                    />
                    <span className="text-lg font-semibold text-slate-900">
                      {type.name} Droplets
                    </span>
                  </dt>
                  <dd className="mt-1 ml-9">{type.description}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {!user && (
          <div className="w-full max-w-2xl px-6 py-8 mx-auto mt-16 text-center border rounded-md lg:px-8 md:py-16 sm:mt-20 bg-slate-50 border-slate-600">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl text-slate-900">
              Ready to join the Odyssey?
            </h2>
            <div className="flex flex-col items-center justify-center mt-10 md:flex-row gap-x-4 gap-y-3">
              <Button size="lg" after={<ArrowRightIcon />} asChild>
                <Link href="/request-access">Request Access</Link>
              </Button>
              <Button
                size="lg"
                variant="link"
                after={<ArrowRightIcon />}
                asChild
              >
                <Link href="/explore">Explore</Link>
              </Button>
            </div>
          </div>
        )}
      </>
    </GradientBackground>
  );
}
