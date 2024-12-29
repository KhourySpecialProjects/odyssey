import { AuthorizedUser } from "@/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type MemberListProps = {
  title: string;
  members: AuthorizedUser[];
  variant: "creator" | "admin" | "manager";
};

const variantStyles = {
  creator: "bg-purple-50 text-purple-700",
  admin: "bg-yellow-50 text-yellow-700",
  manager: "bg-blue-50 text-blue-700",
};

export function MemberList({ title, members, variant }: MemberListProps) {
  if (members.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-slate-500">{title}</h3>
      <div className="space-y-2">
        {members.map((member) => (
          <div
            key={member.id}
            className={cn(
              "flex items-center gap-3 p-2 rounded-lg",
              variantStyles[variant]
            )}
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback>
                {member.email.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{member.email}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}