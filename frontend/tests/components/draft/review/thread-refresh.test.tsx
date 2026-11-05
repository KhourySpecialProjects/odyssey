import { act, render } from "@testing-library/react";
import {
  ReviewCommentsProvider,
  SentFeedbackProvider,
  ThreadRefresh,
} from "@/components/draft/review/review-comments-context";
import { getThreadStamp } from "@/lib/requests/reviews";

const reloadComments = jest.fn();
const reloadSent = jest.fn();
let sentReview: { id: number } | null = { id: 7 };

jest.mock("@/lib/requests/reviews", () => ({ getThreadStamp: jest.fn() }));
jest.mock("@/hooks/use-review-comments", () => ({
  useReviewComments: () => ({ reload: reloadComments }),
}));
jest.mock("@/hooks/use-sent-feedback", () => ({
  useSentFeedback: () => ({ reload: reloadSent, review: sentReview }),
}));

const mockedStamp = jest.mocked(getThreadStamp);
const stamp = (s: string) =>
  mockedStamp.mockResolvedValue({ ok: true, error: null, data: { stamp: s } });

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  sentReview = { id: 7 };
  stamp("1");
});
afterEach(() => jest.useRealTimers());

const mount = (reviewing: boolean, reading: boolean) =>
  render(
    <ReviewCommentsProvider dropletId={3} enabled={reviewing}>
      <SentFeedbackProvider dropletId={3} enabled={reading} isAuthor={false}>
        <ThreadRefresh dropletId={3}>
          <p>page</p>
        </ThreadRefresh>
      </SentFeedbackProvider>
    </ReviewCommentsProvider>,
  );

const afterThirtySeconds = async () => {
  await act(async () => {
    jest.advanceTimersByTime(30_000);
  });
};

describe("ThreadRefresh", () => {
  it("reloads each enabled provider when the stamp changes", async () => {
    mount(true, true);
    await act(async () => {});
    stamp("2");
    await afterThirtySeconds();
    expect(reloadComments).toHaveBeenCalledTimes(1);
    expect(reloadSent).toHaveBeenCalledTimes(1);
  });

  it("only reloads the sent feedback when nothing is under review", async () => {
    mount(false, true);
    await act(async () => {});
    stamp("2");
    await afterThirtySeconds();
    expect(reloadComments).not.toHaveBeenCalled();
    expect(reloadSent).toHaveBeenCalledTimes(1);
  });

  it("makes no request until a sent review exists, then starts", async () => {
    sentReview = null;
    const view = mount(true, true);
    await afterThirtySeconds();
    expect(mockedStamp).not.toHaveBeenCalled();

    sentReview = { id: 7 };
    view.rerender(
      <ReviewCommentsProvider dropletId={3} enabled>
        <SentFeedbackProvider dropletId={3} enabled isAuthor={false}>
          <ThreadRefresh dropletId={3}>
            <p>page</p>
          </ThreadRefresh>
        </SentFeedbackProvider>
      </ReviewCommentsProvider>,
    );
    await act(async () => {});
    expect(mockedStamp).toHaveBeenCalledTimes(1);
  });

  it("makes no request when neither provider is enabled", async () => {
    mount(false, false);
    await afterThirtySeconds();
    expect(mockedStamp).not.toHaveBeenCalled();
  });
});
