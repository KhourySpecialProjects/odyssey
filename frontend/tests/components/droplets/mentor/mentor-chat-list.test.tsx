import { render } from "@testing-library/react";
import {
  MentorChatList,
  type ChatListState,
} from "@/components/droplets/lessons/mentor/mentor-chat-list";

const row = {
  documentId: "chatAAAA1111",
  kind: "lesson" as const,
  title: "What is a join?",
  lastMessageAt: null,
  lesson: null,
  droplet: null,
};

// The lesson footer counts [role="status"] nodes as answered quizzes
it.each<[string, ChatListState]>([
  ["loading", { status: "loading" }],
  ["error", { status: "error" }],
  ["empty", { status: "ready", chats: [] }],
  ["with chats", { status: "ready", chats: [row] }],
])("renders no role=status node when %s", (_name, state) => {
  const { container } = render(
    <MentorChatList
      state={state}
      openId={null}
      busy={false}
      onOpen={jest.fn()}
      onDelete={jest.fn()}
      onRetry={jest.fn()}
      onFocusHeading={jest.fn()}
    />,
  );

  expect(container.querySelectorAll('[role="status"]')).toHaveLength(0);
});
