"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User2Icon, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { AuthorizedUser } from "@/types";
import { Button } from "../ui/button";

interface AuthorCardProps extends AuthorizedUser {
  inDraft?: boolean;
  onRemove?: () => void;
  author: AuthorizedUser;
}

export function AuthorCard({ inDraft, onRemove, author }: AuthorCardProps) {
  const router = useRouter();

  const handleClick = () => {
    router.push(
      `/prof/${author.email?.slice(0, author.email.indexOf("@")) || ""}`,
    );
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove?.();
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
      {inDraft && onRemove && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRemove}
          className="h-8 w-8 shrink-0 text-slate-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
          aria-label="Remove author"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </li>
  );
}
