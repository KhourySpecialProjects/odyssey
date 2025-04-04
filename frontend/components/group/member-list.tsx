import { AuthorizedUser } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, getInitials } from "@/lib/utils";
import { User2Icon } from "lucide-react";

type MemberListProps = {
  title: string;
  members: AuthorizedUser[];
  variant: "creator" | "admin" | "manager";
};

const variantStyles = {
  creator:
    "bg-purple-50 dark:bg-purple-900 dark:text-purple-100 text-purple-700",
  admin: "bg-yellow-50 dark:bg-yellow-900 dark:text-yellow-100 text-yellow-700",
  manager: "bg-blue-50 dark:bg-blue-900 dark:text-blue-100 text-blue-700",
};

export function MemberList({ title, members, variant }: MemberListProps) {
  if (members.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-slate-500 dark:text-slate-300">
        {title}
      </h3>
      <div className="space-y-2">
        {members.map((member) => (
          <div
            key={member.id}
            className={cn(
              "flex items-center gap-3 p-2 rounded-lg ",
              variantStyles[variant],
            )}
          >
            <Avatar variant="round" className="w-8 h-8">
              <AvatarImage src={member.profilePhoto || undefined} />
              <AvatarFallback>
                {member.firstName && member.lastName ? (
                  getInitials(member.firstName + " " + member.lastName)
                ) : (
                  <User2Icon />
                )}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">
                {member.firstName && member.lastName
                  ? member.firstName + " " + member.lastName
                  : member.email}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
