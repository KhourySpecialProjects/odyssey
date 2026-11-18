import { Metadata } from "next";
import { Suspense } from "react";
import { MentorChatsPage } from "@/components/feed/mentor-chats-page";

export const metadata: Metadata = {
  title: "Mentor chats",
  description: "Search, reopen and delete your saved Mentor chats.",
};

// useSearchParams in the page needs a Suspense boundary
export default function MentorChatsRoute() {
  return (
    <Suspense fallback={null}>
      <MentorChatsPage />
    </Suspense>
  );
}
