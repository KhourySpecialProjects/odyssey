import { Metadata } from "next";
import { MentorChatsPage } from "@/components/feed/mentor-chats-page";

export const metadata: Metadata = {
  title: "Mentor chats",
  description: "Search, reopen and delete your saved Mentor chats.",
};

export default function MentorChatsRoute() {
  return <MentorChatsPage />;
}
