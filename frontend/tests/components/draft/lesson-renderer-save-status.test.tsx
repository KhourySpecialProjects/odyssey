import { render, screen, act, fireEvent } from "@testing-library/react";
import { LessonRenderer } from "@/components/draft/lesson/lesson-renderer";
import { useRouter } from "next/navigation";
import { updateLesson } from "@/lib/requests/lesson";
import {
  acquireLessonLock,
  releaseLessonLock,
  heartbeatLessonLock,
  getLessonLockStatus,
  getCurrentAuthorizedUserId,
} from "@/lib/requests/lesson-lock";
import { REVIEW_FROZEN_ERROR } from "@/lib/review-roles";

jest.mock("@/lib/requests/lesson-lock", () => ({
  acquireLessonLock: jest.fn(),
  releaseLessonLock: jest.fn(),
  heartbeatLessonLock: jest.fn(),
  getLessonLockStatus: jest.fn(),
  getCurrentAuthorizedUserId: jest.fn(),
}));
jest.mock("@/lib/requests/lesson", () => ({
  updateLesson: jest.fn(),
  deleteLesson: jest.fn(),
  revalidateLesson: jest.fn().mockResolvedValue(undefined),
  getLatestLessonContent: jest.fn(),
}));
jest.mock("@/lib/requests/droplet", () => ({ getDropletBySlug: jest.fn() }));
jest.mock("@/components/ui/tiptap/lesson-name-input", () => ({
  LessonNameInput: () => <div />,
}));
jest.mock("@/components/draft/lesson/block_list", () => ({
  __esModule: true,
  default: () => <div />,
}));
jest.mock("@/components/draft/lesson/delete-lesson", () => ({
  DeleteLessonButton: () => <button>Delete</button>,
}));
jest.mock("@/components/draft/lesson/blocknote-editor", () => ({
  BlockNoteEditor: ({
    onChange,
  }: {
    onChange?: (content: unknown) => void;
  }) => (
    <button data-testid="type" onClick={() => onChange?.([{ type: "p" }])} />
  ),
}));
jest.mock("@/lib/pyodide/pyodide-context", () => ({
  PyodideProvider: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("next/navigation", () => ({ useRouter: jest.fn() }));
jest.mock("sonner", () => ({
  toast: { error: jest.fn(), success: jest.fn(), info: jest.fn() },
}));
jest.mock("@/lib/utils", () => ({
  htmlToText: jest.fn((text) => text),
  cn: jest.fn((...args) => args.filter(Boolean).join(" ")),
}));

const lesson = {
  id: 1,
  name: "Lesson",
  slug: "lesson",
  type: "standard",
  droplets: [],
  notes: "",
  orderIndex: 1,
  blocks: [],
  blocksV2: [{ type: "p" }],
  blocksVersion: "v2",
} as never;

const flushMicrotasks = () =>
  act(async () => {
    for (let i = 0; i < 8; i++) await Promise.resolve();
  });
const advance = (ms: number) =>
  act(async () => {
    jest.advanceTimersByTime(ms);
    for (let i = 0; i < 8; i++) await Promise.resolve();
  });
const status = () => screen.getByTestId("save-status");

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  (useRouter as jest.Mock).mockReturnValue({ replace: jest.fn() });
  (getCurrentAuthorizedUserId as jest.Mock).mockResolvedValue(42);
  (releaseLessonLock as jest.Mock).mockResolvedValue(undefined);
  (heartbeatLessonLock as jest.Mock).mockResolvedValue(true);
  (acquireLessonLock as jest.Mock).mockResolvedValue({ success: true });
  (updateLesson as jest.Mock).mockResolvedValue({ ok: true, data: {} });
  (getLessonLockStatus as jest.Mock).mockResolvedValue({
    isLocked: true,
    lockedBy: null,
    lockedAt: null,
    review: { inReview: false, isReviewer: false },
  });
});
afterEach(() => jest.useRealTimers());

const open = async () => {
  render(<LessonRenderer lesson={lesson} dropletSlug="d" />);
  await flushMicrotasks();
};
const type = async () => {
  fireEvent.click(screen.getByTestId("type"));
  await flushMicrotasks();
};

it("announces politely and shows Saving, then Saved", async () => {
  await open();
  expect(status()).toHaveAttribute("aria-live", "polite");
  await type();
  expect(status()).toHaveTextContent("Unsaved changes");
  await advance(1500);
  expect(status()).toHaveTextContent("Saved just now");
});

it("shows Failed with Retry, and Retry saves again", async () => {
  await open();
  (updateLesson as jest.Mock).mockResolvedValueOnce({ ok: false, error: "x" });
  await type();
  await advance(1500);
  expect(status()).toHaveTextContent("Save failed");
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  await flushMicrotasks();
  expect(updateLesson).toHaveBeenCalledTimes(2);
  expect(status()).toHaveTextContent("Saved just now");
});

it("treats a thrown save as failed", async () => {
  await open();
  (updateLesson as jest.Mock).mockRejectedValueOnce(new Error("offline"));
  await type();
  await advance(1500);
  expect(status()).toHaveTextContent("Save failed");
});

it("shows a review-frozen refusal as its own state", async () => {
  await open();
  (updateLesson as jest.Mock).mockResolvedValueOnce({
    ok: false,
    error: REVIEW_FROZEN_ERROR,
  });
  await type();
  await advance(1500);
  expect(status()).toHaveTextContent("In review");
  expect(status()).not.toHaveTextContent("Save failed");
  expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
});

it("warns before leaving with an unsaved change, not after it is saved", async () => {
  await open();
  await type();
  const early = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(early);
  expect(early.defaultPrevented).toBe(true);
  await advance(1500);
  const late = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(late);
  expect(late.defaultPrevented).toBe(false);
});

it("shows a banner when the lock is lost, then the takeover notice on regain", async () => {
  await open();
  expect(screen.queryByText(/lost the editing lock/i)).toBeNull();
  (heartbeatLessonLock as jest.Mock).mockResolvedValue(false);
  await advance(30_000);
  expect(screen.getByText(/lost the editing lock/i)).toBeInTheDocument();
});
