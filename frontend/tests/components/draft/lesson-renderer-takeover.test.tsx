import { render, screen, act } from "@testing-library/react";
import { LessonRenderer } from "@/components/draft/lesson/lesson-renderer";
import { useRouter } from "next/navigation";
import { updateLesson, getLatestLessonContent } from "@/lib/requests/lesson";
import {
  acquireLessonLock,
  releaseLessonLock,
  heartbeatLessonLock,
  getLessonLockStatus,
  getCurrentAuthorizedUserId,
} from "@/lib/requests/lesson-lock";

// The real useEditingLock runs here; only the server actions are mocked.
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
  LessonNameInput: () => <div data-testid="lesson-name-input" />,
}));
jest.mock("@/components/draft/lesson/block_list", () => ({
  __esModule: true,
  default: () => <div data-testid="block-list" />,
}));
jest.mock("@/components/draft/lesson/delete-lesson", () => ({
  DeleteLessonButton: () => <button>Delete</button>,
}));
jest.mock("@/components/draft/lesson/blocknote-editor", () => ({
  BlockNoteEditor: ({
    editable,
    initialContent,
  }: {
    editable: boolean;
    initialContent?: unknown;
  }) => (
    <div
      data-testid="blocknote-editor"
      data-editable={String(editable)}
      data-content={JSON.stringify(initialContent ?? null)}
    />
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

const OLD = [{ type: "paragraph", content: "old copy" }];
const NEW = [{ type: "paragraph", content: "A's newer edit" }];
const lesson = {
  id: 1,
  name: "Lesson",
  slug: "lesson",
  type: "standard",
  droplets: [],
  notes: "",
  orderIndex: 1,
  blocks: [],
  blocksV2: OLD,
  blocksVersion: "v2",
} as never;
const A = { id: 9, firstName: "Ada", lastName: "Lovelace" };

const editor = () => screen.getByTestId("blocknote-editor");

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  (useRouter as jest.Mock).mockReturnValue({ replace: jest.fn() });
  (getCurrentAuthorizedUserId as jest.Mock).mockResolvedValue(42);
  (releaseLessonLock as jest.Mock).mockResolvedValue(undefined);
  (heartbeatLessonLock as jest.Mock).mockResolvedValue(true);
  (updateLesson as jest.Mock).mockResolvedValue({ ok: true, data: {} });
  (getLessonLockStatus as jest.Mock).mockResolvedValue({
    isLocked: true,
    lockedBy: A,
    lockedAt: null,
    review: { inReview: false, isReviewer: false },
  });
  (acquireLessonLock as jest.Mock).mockResolvedValueOnce({
    success: false,
    error: "Lesson is locked",
    lockedBy: A,
  });
});

afterEach(() => jest.useRealTimers());

const settle = () =>
  act(async () => {
    for (let i = 0; i < 6; i++) await Promise.resolve();
  });

it("shows the fresh content before the tab becomes editable after a poll takeover", async () => {
  render(<LessonRenderer lesson={lesson} dropletSlug="d" />);
  await settle();
  expect(editor()).toHaveAttribute("data-editable", "false");
  expect(screen.getByText(/is currently editing/)).toBeInTheDocument();

  // A leaves; the lock expires. B's poll takes it, and the read is slow.
  let finish!: (v: unknown) => void;
  (getLessonLockStatus as jest.Mock).mockResolvedValue({
    isLocked: false,
    lockedBy: null,
    lockedAt: null,
    review: { inReview: false, isReviewer: false },
  });
  (acquireLessonLock as jest.Mock).mockResolvedValue({ success: true });
  (getLatestLessonContent as jest.Mock).mockReturnValue(
    new Promise((r) => (finish = r)),
  );
  await act(async () => {
    jest.advanceTimersByTime(10_000);
    for (let i = 0; i < 6; i++) await Promise.resolve();
  });

  // Lock held, fresh content not applied yet: still the old copy, read-only.
  expect(getLatestLessonContent).toHaveBeenCalledWith(1);
  expect(editor()).toHaveAttribute("data-editable", "false");
  expect(editor()).toHaveAttribute("data-content", JSON.stringify(OLD));
  expect(screen.getByText("Loading the latest version...")).toBeVisible();

  await act(async () => {
    finish({
      ok: true,
      error: null,
      data: {
        name: "Lesson",
        blocks: [],
        blocksV2: NEW,
        blocksVersion: "v2",
      },
    });
    for (let i = 0; i < 6; i++) await Promise.resolve();
  });

  expect(editor()).toHaveAttribute("data-content", JSON.stringify(NEW));
  expect(editor()).toHaveAttribute("data-editable", "true");
  expect(screen.getByRole("status")).toHaveTextContent(
    "Ada Lovelace finished editing. You're now editing the latest version.",
  );
  // Nothing was saved over A's edit.
  expect(updateLesson).not.toHaveBeenCalled();
});

it("stays read-only and keeps the old copy when the read fails, then retries", async () => {
  render(<LessonRenderer lesson={lesson} dropletSlug="d" />);
  await settle();
  (getLessonLockStatus as jest.Mock).mockResolvedValue({
    isLocked: false,
    lockedBy: null,
    lockedAt: null,
    review: { inReview: false, isReviewer: false },
  });
  (acquireLessonLock as jest.Mock).mockResolvedValue({ success: true });
  (getLatestLessonContent as jest.Mock).mockResolvedValueOnce({
    ok: false,
    error: "Could not load",
    data: null,
  });

  await act(async () => {
    jest.advanceTimersByTime(10_000);
    for (let i = 0; i < 8; i++) await Promise.resolve();
  });

  expect(editor()).toHaveAttribute("data-editable", "false");
  expect(releaseLessonLock).toHaveBeenCalledWith(1);
  expect(updateLesson).not.toHaveBeenCalled();
});
