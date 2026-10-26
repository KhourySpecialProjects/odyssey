import { act, renderHook } from "@testing-library/react";
import { useEditingLock } from "@/hooks/useEditingLock";
import {
  acquireLessonLock,
  getCurrentAuthorizedUserId,
  getLessonLockStatus,
  heartbeatLessonLock,
  releaseLessonLock,
  type LockStatus,
} from "@/lib/requests/lesson-lock";

jest.mock("@/lib/requests/lesson-lock", () => ({
  acquireLessonLock: jest.fn(),
  releaseLessonLock: jest.fn(),
  heartbeatLessonLock: jest.fn(),
  getLessonLockStatus: jest.fn(),
  getCurrentAuthorizedUserId: jest.fn(),
}));

const mockAcquire = jest.mocked(acquireLessonLock);
const mockRelease = jest.mocked(releaseLessonLock);
const mockHeartbeat = jest.mocked(heartbeatLessonLock);
const mockStatus = jest.mocked(getLessonLockStatus);
const mockUserId = jest.mocked(getCurrentAuthorizedUserId);

const status = (
  review: LockStatus["review"],
  over: Partial<LockStatus> = {},
): LockStatus => ({
  isLocked: false,
  lockedBy: null,
  lockedAt: null,
  review,
  ...over,
});

const NOT_IN_REVIEW = { inReview: false, isReviewer: false };
const CREATOR_IN_REVIEW = { inReview: true, isReviewer: false };
const REVIEWER_IN_REVIEW = { inReview: true, isReviewer: true };

/** Mount and let the async init finish. */
async function mount() {
  const hook = renderHook(() => useEditingLock(1));
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
  return hook;
}

/** Advance the 10 s poll once and let its async work finish. */
async function tick() {
  await act(async () => {
    jest.advanceTimersByTime(10_000);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.resetAllMocks();
  mockUserId.mockResolvedValue(42);
  mockAcquire.mockResolvedValue({ success: true });
  mockRelease.mockResolvedValue(undefined);
  mockHeartbeat.mockResolvedValue(true);
  mockStatus.mockResolvedValue(status(NOT_IN_REVIEW));
});

afterEach(() => {
  jest.useRealTimers();
});

describe("useEditingLock", () => {
  it("acquires the lock when the droplet is not in review", async () => {
    const { result } = await mount();

    expect(mockAcquire).toHaveBeenCalledWith(1);
    expect(result.current.isOwnLock).toBe(true);
    expect(result.current.inReview).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it("never acquires for a creator when the droplet is in review", async () => {
    mockStatus.mockResolvedValue(status(CREATOR_IN_REVIEW));

    const { result } = await mount();
    await tick();
    await tick();

    expect(mockAcquire).not.toHaveBeenCalled();
    expect(result.current.isOwnLock).toBe(false);
    expect(result.current.inReview).toBe(true);
    expect(result.current.isReviewer).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it("lets a reviewer acquire only after startEditing", async () => {
    mockStatus.mockResolvedValue(status(REVIEWER_IN_REVIEW));

    const { result } = await mount();
    await tick();
    expect(mockAcquire).not.toHaveBeenCalled();
    expect(result.current.isReviewer).toBe(true);

    await act(async () => {
      await result.current.startEditing();
    });

    expect(mockAcquire).toHaveBeenCalledTimes(1);
    expect(result.current.isOwnLock).toBe(true);
  });

  it("stopEditing releases the reviewer's lock", async () => {
    mockStatus.mockResolvedValue(status(REVIEWER_IN_REVIEW));
    const { result } = await mount();
    await act(async () => {
      await result.current.startEditing();
    });

    await act(async () => {
      await result.current.stopEditing();
    });

    expect(mockRelease).toHaveBeenCalledWith(1);
    expect(result.current.isOwnLock).toBe(false);
  });

  it("shows the holder when a reviewer's acquire hits a 409", async () => {
    mockStatus.mockResolvedValue(status(REVIEWER_IN_REVIEW));
    const other = { id: 9, firstName: "O", lastName: "U" };
    mockAcquire.mockResolvedValue({
      success: false,
      error: "Lesson is locked",
      lockedBy: other,
    });
    const { result } = await mount();

    await act(async () => {
      await result.current.startEditing();
    });

    expect(result.current.isOwnLock).toBe(false);
    expect(result.current.lockedBy).toEqual(other);
  });

  it("releases within one tick when the droplet enters review", async () => {
    const { result } = await mount();
    expect(result.current.isOwnLock).toBe(true);
    mockStatus.mockResolvedValue(status(CREATOR_IN_REVIEW));

    await tick();

    expect(mockRelease).toHaveBeenCalledWith(1);
    expect(result.current.isOwnLock).toBe(false);
    expect(result.current.inReview).toBe(true);
    expect(result.current.isReviewer).toBe(false);
  });

  it("sets reviewEnded and never acquires when the review ends", async () => {
    mockStatus.mockResolvedValue(status(CREATOR_IN_REVIEW));
    const { result } = await mount();
    mockStatus.mockResolvedValue(status(NOT_IN_REVIEW));

    await tick();
    await tick();

    expect(result.current.reviewEnded).toBe(true);
    expect(result.current.inReview).toBe(false);
    expect(mockAcquire).not.toHaveBeenCalled();
    expect(result.current.isOwnLock).toBe(false);
  });

  it("drops a reviewer's lock when the review ends", async () => {
    mockStatus.mockResolvedValue(status(REVIEWER_IN_REVIEW));
    const { result } = await mount();
    await act(async () => {
      await result.current.startEditing();
    });
    mockStatus.mockResolvedValue(status(NOT_IN_REVIEW));

    await tick();

    expect(result.current.reviewEnded).toBe(true);
    expect(result.current.isOwnLock).toBe(false);
    expect(mockRelease).toHaveBeenCalledWith(1);
  });

  it("markFrozen releases a held lock and freezes", async () => {
    const { result } = await mount();

    await act(async () => {
      await result.current.markFrozen();
    });

    expect(mockRelease).toHaveBeenCalledWith(1);
    expect(result.current.isOwnLock).toBe(false);
    expect(result.current.inReview).toBe(true);
    expect(result.current.isReviewer).toBe(false);
  });

  it("keeps the previous review state when the poll returns a null review", async () => {
    mockStatus.mockResolvedValue(status(CREATOR_IN_REVIEW));
    const { result } = await mount();
    mockStatus.mockResolvedValue(status(null));

    await tick();

    expect(result.current.inReview).toBe(true);
    expect(result.current.reviewEnded).toBe(false);
    expect(mockAcquire).not.toHaveBeenCalled();
  });

  it("treats an in_review acquire refusal as frozen", async () => {
    mockAcquire.mockResolvedValue({ success: false, error: "in_review" });

    const { result } = await mount();

    expect(result.current.inReview).toBe(true);
    expect(result.current.isReviewer).toBe(false);
    expect(result.current.isOwnLock).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it("auto-acquires when another editor's lock frees up", async () => {
    const other = { id: 9, firstName: "O", lastName: "U" };
    mockAcquire.mockResolvedValueOnce({
      success: false,
      error: "Lesson is locked",
      lockedBy: other,
    });
    const { result } = await mount();
    expect(result.current.isOwnLock).toBe(false);
    expect(result.current.lockedBy).toEqual(other);

    mockStatus.mockResolvedValue(status(NOT_IN_REVIEW, { isLocked: false }));
    await tick();

    expect(mockAcquire).toHaveBeenCalledTimes(2);
    expect(result.current.isOwnLock).toBe(true);
  });

  it("sends a heartbeat every 30 s while it holds the lock", async () => {
    await mount();

    await act(async () => {
      jest.advanceTimersByTime(30_000);
      await Promise.resolve();
    });

    expect(mockHeartbeat).toHaveBeenCalledWith(1);
  });
});
