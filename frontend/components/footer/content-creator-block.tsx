"use client";

import { AuthorizedUser } from "@/types";
import Link from "next/link";
import { Github, LinkIcon, Linkedin } from "lucide-react";
import { useState } from "react";

export function ContentCreatorBlock({
  contentCreator,
}: {
  contentCreator: AuthorizedUser;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <li
        onClick={() => setIsOpen(!isOpen)}
        className="relative cursor-pointer rounded-md border border-gray-300 px-6 py-4 transition duration-150 hover:border-gray-500 [&:not(:first-child)]:pt-3"
      >
        <div className="flex items-center space-x-4">
          <div className="min-w-0 flex-1">
            <p className="truncate text-center text-xl font-bold text-slate-900 dark:text-slate-300">
              {contentCreator.firstName && contentCreator.lastName
                ? contentCreator.firstName + " " + contentCreator.lastName
                : contentCreator.email}
            </p>
          </div>
        </div>

        <div
          className={`overflow-hidden transition-[max-height] duration-500 ease-in-out ${
            isOpen ? "max-h-96" : "max-h-0"
          }`}
        >
          <div>
            {contentCreator.profilePhoto && (
              <div className="flex items-center justify-center pt-4">
                <img
                  src={contentCreator.profilePhoto}
                  alt={`${contentCreator.firstName}'s profile`}
                  className="h-20 w-20 rounded-full object-cover"
                />
              </div>
            )}
            <div className="flex justify-center space-x-2 pt-4">
              {contentCreator.linkedin && (
                <Link href={contentCreator.linkedin} legacyBehavior>
                  <a target="_blank" rel="noopener noreferrer">
                    <Linkedin className="dark:text-slate-300" />
                  </a>
                </Link>
              )}
              {contentCreator.github && (
                <Link href={contentCreator.github} legacyBehavior>
                  <a target="_blank" rel="noopener noreferrer">
                    <Github className="dark:text-slate-300" />
                  </a>
                </Link>
              )}
              {contentCreator.website && (
                <Link href={contentCreator.website} legacyBehavior>
                  <a target="_blank" rel="noopener noreferrer">
                    <LinkIcon className="dark:text-slate-300" />
                  </a>
                </Link>
              )}
            </div>
            {contentCreator.bio && (
              <div className="mt-4 flex max-h-40 justify-center overflow-scroll md:max-h-none md:overflow-hidden dark:text-slate-300">
                {contentCreator.bio}
              </div>
            )}
          </div>
        </div>
      </li>
    </div>
  );
}
