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
const mockRefresh = jest.fn<Promise<boolean>, []>();

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
  const hook = renderHook(() => useEditingLock(1, mockRefresh));
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
  mockRefresh.mockReset();
  mockRefresh.mockResolvedValue(true);
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

  it("does not acquire when the first review lookup fails, and retries on the next poll", async () => {
    mockStatus.mockResolvedValue(status(null));

    const { result } = await mount();

    expect(mockAcquire).not.toHaveBeenCalled();
    expect(result.current.isOwnLock).toBe(false);
    expect(result.current.isLoading).toBe(true);

    await tick();
    expect(mockAcquire).not.toHaveBeenCalled();

    mockStatus.mockResolvedValue(status(NOT_IN_REVIEW));
    await tick();

    expect(mockAcquire).toHaveBeenCalledTimes(1);
    expect(result.current.isOwnLock).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it("stays frozen when a failed first lookup is followed by an in-review state", async () => {
    mockStatus.mockResolvedValue(status(null));
    const { result } = await mount();

    mockStatus.mockResolvedValue(status(CREATOR_IN_REVIEW));
    await tick();

    expect(mockAcquire).not.toHaveBeenCalled();
    expect(result.current.inReview).toBe(true);
    expect(result.current.isLoading).toBe(false);
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

describe("useEditingLock: refresh on takeover (ODY-811)", () => {
  const OTHER = { id: 9, firstName: "Ada", lastName: "Lovelace" };
  const LOCKED = { success: false, error: "Lesson is locked", lockedBy: OTHER };

  /** Mounts read-only because another editor holds the lock. */
  async function mountLockedByOther() {
    mockAcquire.mockResolvedValueOnce(LOCKED);
    return mount();
  }

  it("does not refresh for the acquire on mount", async () => {
    const { result } = await mount();

    expect(result.current.isOwnLock).toBe(true);
    expect(result.current.tookOver).toBe(false);
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it("awaits the refresh before a poll takeover turns editable", async () => {
    let finish!: (ok: boolean) => void;
    mockRefresh.mockReturnValue(new Promise<boolean>((r) => (finish = r)));
    const { result } = await mountLockedByOther();

    await tick();

    expect(mockAcquire).toHaveBeenCalledTimes(2);
    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(result.current.isOwnLock).toBe(false);
    expect(result.current.isRefreshing).toBe(true);

    await act(async () => {
      finish(true);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.isOwnLock).toBe(true);
    expect(result.current.isRefreshing).toBe(false);
    expect(result.current.tookOver).toBe(true);
    expect(result.current.tookOverFrom).toEqual(OTHER);
    expect(mockRelease).not.toHaveBeenCalled();
  });

  it("releases the lock and stays read-only when the refresh fails, then retries", async () => {
    mockRefresh.mockResolvedValueOnce(false);
    const { result } = await mountLockedByOther();

    await tick();

    expect(result.current.isOwnLock).toBe(false);
    expect(result.current.isRefreshing).toBe(false);
    expect(mockRelease).toHaveBeenCalledWith(1);
    expect(result.current.error).toMatch(/latest version/);

    await tick();

    expect(mockRefresh).toHaveBeenCalledTimes(2);
    expect(result.current.isOwnLock).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("treats a throwing refresh as a failure", async () => {
    mockRefresh.mockRejectedValueOnce(new Error("network"));
    const { result } = await mountLockedByOther();

    await tick();

    expect(result.current.isOwnLock).toBe(false);
    expect(mockRelease).toHaveBeenCalledWith(1);
  });

  it("does not gain the lock when the droplet entered review during the refresh", async () => {
    let finish!: (ok: boolean) => void;
    mockRefresh.mockReturnValue(new Promise<boolean>((r) => (finish = r)));
    const { result } = await mountLockedByOther();
    await tick();

    await act(async () => {
      await result.current.markFrozen();
    });
    await act(async () => {
      finish(true);
      await Promise.resolve();
    });

    expect(result.current.isOwnLock).toBe(false);
    expect(result.current.isRefreshing).toBe(false);
  });

  it("refreshes for a reviewer's startEditing too", async () => {
    mockStatus.mockResolvedValue(status(REVIEWER_IN_REVIEW));
    const { result } = await mount();
    expect(mockRefresh).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.startEditing();
    });

    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(result.current.isOwnLock).toBe(true);
    expect(result.current.tookOver).toBe(true);
  });

  it("keeps a reviewer read-only and releases the lock when startEditing's refresh fails", async () => {
    mockStatus.mockResolvedValue(status(REVIEWER_IN_REVIEW));
    mockRefresh.mockResolvedValue(false);
    const { result } = await mount();

    await act(async () => {
      await result.current.startEditing();
    });

    expect(result.current.isOwnLock).toBe(false);
    expect(mockRelease).toHaveBeenCalledWith(1);
  });

  it("refreshes when the poll takes back a lock lost to a failed heartbeat", async () => {
    const { result } = await mount();
    mockHeartbeat.mockResolvedValueOnce(false);
    await act(async () => {
      jest.advanceTimersByTime(30_000);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(result.current.isOwnLock).toBe(false);

    await tick();

    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(result.current.isOwnLock).toBe(true);
  });

  it("never refreshes or acquires after the review ended (D11)", async () => {
    mockStatus.mockResolvedValue(status(REVIEWER_IN_REVIEW));
    const { result } = await mount();
    mockStatus.mockResolvedValue(status(NOT_IN_REVIEW));
    await tick();
    await tick();

    expect(result.current.reviewEnded).toBe(true);
    expect(mockAcquire).not.toHaveBeenCalled();
    expect(mockRefresh).not.toHaveBeenCalled();
  });
});
