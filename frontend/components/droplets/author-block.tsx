"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User2Icon } from "lucide-react";
import { useRouter } from "next/navigation";

import { AuthorizedUser } from "@/types";

export function AuthorCard(author: AuthorizedUser) {
  const router = useRouter();

  const handleClick = () => {
    console.log(author.email);
    router.push(
      `/prof/${author.email?.slice(0, author.email.indexOf("@")) || ""}`,
    );
  };

  return (
    <li
      onClick={handleClick}
      className="inline-flex cursor-pointer gap-4 p-4 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
    >
      <Avatar variant="round" className="border border-sky-800">
        <AvatarImage src={author?.profilePhoto || undefined} />
        <AvatarFallback>
          {author?.firstName && author?.lastName ? (
            author.firstName[0] + author.lastName[0]
          ) : (
            <User2Icon className="h-4 w-4" />
          )}
        </AvatarFallback>
      </Avatar>

      <div className={!author.bio ? "flex flex-row items-center" : ""}>
        <span className="leading-relaxed font-bold">
          {author.firstName + " " + author.lastName}
        </span>

        {author.bio ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {author.bio}
          </p>
        ) : null}
      </div>
    </li>
  );
}
