import { AuthorizedUser } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Button } from "../ui/button";
import Link from "next/link";
import { Github, Linkedin, User2Icon } from "lucide-react";
import { FriendCompletedDroplets } from "./friend-completed-droplets";
import { startTransition, useState } from "react";
import { toast } from "sonner";
import { BlockUser, removeFriend } from "@/lib/requests/friends";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { getInitials } from "@/lib/utils";

export function UserBlock({
  user,
  curUser,
}: {
  user: AuthorizedUser;
  curUser: AuthorizedUser;
}) {
  const [open, setOpen] = useState(false);
  const handleBlock = () => {
    startTransition(async () => {
      const result = await BlockUser(curUser.id, user.id);
      await removeFriend(curUser.id, user.id);
      if (result.success) {
        toast.success("User blocked");
      } else {
        toast.error("Failed to block user");
      }
    });
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-sky-300 text-black hover:bg-sky-400">
          View Profile
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <div className="flex justify-center items-center">
            <Avatar
              variant="round"
              className="w-20 h-20 rounded-full justify-center items-center"
            >
              <AvatarImage src={user?.profilePhoto || undefined} />
              <AvatarFallback>
                {user?.firstName ? (
                  getInitials(user.firstName + " " + user.lastName)
                ) : (
                  <User2Icon />
                )}
              </AvatarFallback>
            </Avatar>
          </div>
          <DialogTitle style={{ fontSize: "2rem", textAlign: "center" }}>
            {user.firstName} {user.lastName}
          </DialogTitle>
          <div className="flex justify-center space-x-2">
            {user.linkedin && (
              <Link href={user.linkedin} legacyBehavior>
                <a target="_blank" rel="noopener noreferrer">
                  <Linkedin />
                </a>
              </Link>
            )}
            {user.github && (
              <Link href={user.github} legacyBehavior>
                <a target="_blank" rel="noopener noreferrer">
                  <Github />
                </a>
              </Link>
            )}
          </div>
          {user.bio && <DialogDescription>{user.bio}</DialogDescription>}
          <DialogDescription>Completed Droplets: </DialogDescription>
          <FriendCompletedDroplets friend={user} />
          <div
            className={`inline-flex items-center gap-2 ${curUser == user || curUser.blocked.includes(user) ? "visibility: hidden" : "visibility: visible"}`}
            onClick={handleBlock}
          >
            <Button
              size="sm"
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Block user
            </Button>
          </div>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
