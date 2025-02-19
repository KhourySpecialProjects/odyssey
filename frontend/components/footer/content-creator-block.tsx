"use client";

import { AuthorizedUser } from "@/types";
import Link from "next/link";
import { Github, Linkedin } from "lucide-react";
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
        className="py-4 px-6 [&:not(:first-child)]:pt-3 relative border border-gray-300 rounded-md transition duration-150 hover:border-gray-500 cursor-pointer"
      >
        <div className="flex items-center space-x-4">
          <div className="flex-1 min-w-0">
            <p className="text-xl font-bold truncate text-slate-900 dark:text-white text-center">
              {contentCreator.firstName && contentCreator.lastName
                ? contentCreator.firstName + " " + contentCreator.lastName
                : contentCreator.email}
            </p>
          </div>
        </div>

        <div
          className={`overflow-hidden transition-[max-height] duration-300 ease-in-out ${
            isOpen ? "max-h-96" : "max-h-0"
          }`}
        >
          <div>
            {contentCreator.profilePhoto && (
              <div className="flex justify-center items-center pt-4">
                <img
                  src={contentCreator.profilePhoto}
                  alt={`${contentCreator.firstName}'s profile`}
                  className="w-20 h-20 rounded-full object-cover"
                />
              </div>
            )}
            <div className="flex justify-center space-x-2 pt-4">
              {contentCreator.linkedin && (
                <Link href={contentCreator.linkedin} legacyBehavior>
                  <a target="_blank" rel="noopener noreferrer">
                    <Linkedin />
                  </a>
                </Link>
              )}
              {contentCreator.github && (
                <Link href={contentCreator.github} legacyBehavior>
                  <a target="_blank" rel="noopener noreferrer">
                    <Github />
                  </a>
                </Link>
              )}
            </div>
            <div className="flex justify-center pt-4">
              Email: {contentCreator.email}
            </div>
            {contentCreator.bio && (
              <div className="flex justify-center pt-4">
                Bio: {contentCreator.bio}
              </div>
            )}
          </div>
        </div>
      </li>
    </div>
  );
}
