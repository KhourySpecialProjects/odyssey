import type { ComponentProps } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import posthog from "posthog-js";
import {
  MentorRating,
  createRatingStore,
} from "@/components/droplets/lessons/mentor/mentor-rating";
import { saveMentorFeedback } from "@/lib/requests/mentor-feedback";

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));
jest.mock("@/lib/requests/mentor-feedback", () => ({
  saveMentorFeedback: jest.fn(),
}));

const save = jest.mocked(saveMentorFeedback);
const capture = jest.mocked(posthog.capture);
const KEY = "7b1f0c2e-3a4d-4e5f-8a9b-0c1d2e3f4a5b";
const TICK = "Share this question and answer to help improve Mentor";

const renderRating = (
  extra: Partial<ComponentProps<typeof MentorRating>> = {},
) =>
  render(
    <MentorRating
      kind="lesson"
      dropletId={3}
      lessonId={4}
      answerKey={KEY}
      citations={[
        {
          ref: "p1",
          blockIndex: 2,
          label: "SENTINEL label",
          anchor: { v: 1, field: "blocks", blockId: "b1", quote: "SENTINEL" },
        },
        {
          ref: "p2",
          blockIndex: 5,
          label: "x",
          anchor: { v: 1, field: "blocks" },
        },
      ]}
      answerText="The answer"
      questionText="The question"
      {...extra}
    />,
  );
const good = () => screen.getByRole("button", { name: "Good answer" });
const bad = () => screen.getByRole("button", { name: "Bad answer" });
const ok = (canShare: boolean) =>
  save.mockResolvedValue({ ok: true, canShare, promptVersion: "v1" });

beforeEach(() => {
  jest.clearAllMocks();
  ok(true);
});

describe("MentorRating", () => {
  it("saves a click with ids-only citations and no text, and fires mentor_rated", async () => {
    renderRating();
    await userEvent.click(good());

    await waitFor(() => expect(capture).toHaveBeenCalledTimes(1));
    expect(save).toHaveBeenCalledWith({
      answerKey: KEY,
      kind: "lesson",
      rating: "up",
      dropletId: 3,
      lessonId: 4,
      citations: [
        { ref: "p1", blockId: "b1", blockIndex: 2 },
        { ref: "p2", blockIndex: 5 },
      ],
      shared: false,
    });
    expect(capture).toHaveBeenCalledWith("mentor_rated", {
      droplet_id: 3,
      lesson_id: 4,
      rating: "up",
      kind: "lesson",
      answer_key: KEY,
      prompt_version: "v1",
    });
    expect(good()).toHaveAttribute("aria-pressed", "true");
  });

  it("fires again for a changed rating, ignores the pressed one", async () => {
    renderRating();
    await userEvent.click(good());
    await waitFor(() => expect(capture).toHaveBeenCalledTimes(1));
    await userEvent.click(good());
    await userEvent.click(bad());

    await waitFor(() => expect(capture).toHaveBeenCalledTimes(2));
    expect(save).toHaveBeenCalledTimes(2);
    expect(bad()).toHaveAttribute("aria-pressed", "true");
    expect(good()).toHaveAttribute("aria-pressed", "false");
  });

  it("reverts and toasts when the save fails, with no event", async () => {
    save.mockResolvedValue({ ok: false, error: "failed" });
    renderRating();
    await userEvent.click(good());

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Couldn't save your rating"),
    );
    expect(good()).toHaveAttribute("aria-pressed", "false");
    expect(capture).not.toHaveBeenCalled();
  });

  it("shows no tick when sharing is off", async () => {
    ok(false);
    renderRating();
    expect(screen.queryByLabelText(TICK)).toBeNull();
    await userEvent.click(good());

    await waitFor(() => expect(capture).toHaveBeenCalled());
    expect(screen.queryByLabelText(TICK)).toBeNull();
  });

  it("ticks to share both texts and unticks to clear them, without mentor_rated", async () => {
    renderRating();
    expect(screen.queryByLabelText(TICK)).toBeNull();
    await userEvent.click(good());
    await userEvent.click(await screen.findByLabelText(TICK));

    await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
    expect(save).toHaveBeenLastCalledWith(
      expect.objectContaining({
        rating: "up",
        shared: true,
        answerText: "The answer",
        questionText: "The question",
      }),
    );

    await userEvent.click(screen.getByLabelText(TICK));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(3));
    const last = save.mock.calls[2][0] as Record<string, unknown>;
    expect(last.shared).toBe(false);
    expect(last).not.toHaveProperty("answerText");
    expect(last).not.toHaveProperty("questionText");
    expect(capture).toHaveBeenCalledTimes(1);
  });

  it("reverts the tick and toasts when sharing fails", async () => {
    renderRating();
    await userEvent.click(good());
    const tick = await screen.findByLabelText(TICK);
    save.mockResolvedValue({ ok: false, error: "failed" });
    await userEvent.click(tick);

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Couldn't share this answer"),
    );
    expect(screen.getByLabelText(TICK)).not.toBeChecked();
  });

  it("hides the tick when Strapi says sharing is off", async () => {
    renderRating();
    await userEvent.click(good());
    const tick = await screen.findByLabelText(TICK);
    save.mockResolvedValue({ ok: false, error: "sharing_off" });
    tick.focus();
    await userEvent.keyboard(" ");

    await waitFor(() => expect(screen.queryByLabelText(TICK)).toBeNull());
    expect(good()).toHaveFocus();
  });

  it("ignores clicks while a save is in flight: one save, one event", async () => {
    let finish: (v: Awaited<ReturnType<typeof saveMentorFeedback>>) => void;
    save.mockReturnValue(new Promise((r) => (finish = r)));
    renderRating();
    await userEvent.click(good());
    await userEvent.click(bad());
    finish!({ ok: true, canShare: false, promptVersion: "v1" });

    await waitFor(() => expect(capture).toHaveBeenCalledTimes(1));
    expect(save).toHaveBeenCalledTimes(1);
    expect(good()).toHaveAttribute("aria-pressed", "true");
  });

  it("marks the thumbs and tick aria-disabled while saving, keeping focus", async () => {
    renderRating();
    await userEvent.click(good());
    const tick = await screen.findByLabelText(TICK);
    let finish!: (v: Awaited<ReturnType<typeof saveMentorFeedback>>) => void;
    save.mockReturnValue(new Promise((r) => (finish = r)));
    await userEvent.click(bad());

    for (const el of [good(), bad(), tick]) {
      expect(el).toHaveAttribute("aria-disabled", "true");
    }
    expect(bad()).toHaveFocus();
    finish({ ok: true, canShare: true, promptVersion: "v1" });

    await waitFor(() =>
      expect(good()).toHaveAttribute("aria-disabled", "false"),
    );
    expect(bad()).toHaveAttribute("aria-disabled", "false");
    expect(screen.getByLabelText(TICK)).toHaveAttribute(
      "aria-disabled",
      "false",
    );
  });

  it("hides the tick and focuses the thumb when an untick returns canShare false", async () => {
    renderRating();
    await userEvent.click(good());
    await userEvent.click(await screen.findByLabelText(TICK));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
    save.mockResolvedValue({ ok: true, canShare: false, promptVersion: "v1" });
    screen.getByLabelText(TICK).focus();
    await userEvent.keyboard(" ");

    await waitFor(() => expect(screen.queryByLabelText(TICK)).toBeNull());
    expect(good()).toHaveFocus();
  });

  it("re-sends the texts when the rating changes while ticked", async () => {
    renderRating();
    await userEvent.click(good());
    await userEvent.click(await screen.findByLabelText(TICK));
    await userEvent.click(bad());

    await waitFor(() => expect(save).toHaveBeenCalledTimes(3));
    expect(save).toHaveBeenLastCalledWith(
      expect.objectContaining({
        rating: "down",
        shared: true,
        answerText: "The answer",
        questionText: "The question",
      }),
    );
  });

  describe("when sharing is switched off while ticked", () => {
    const tickThenRate = async () => {
      renderRating();
      await userEvent.click(good());
      await userEvent.click(await screen.findByLabelText(TICK));
      await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
    };

    it("saves the new rating without text and hides the tick", async () => {
      await tickThenRate();
      save.mockResolvedValueOnce({ ok: false, error: "sharing_off" });
      save.mockResolvedValueOnce({
        ok: true,
        canShare: false,
        promptVersion: "v1",
      });
      await userEvent.click(bad());

      await waitFor(() => expect(screen.queryByLabelText(TICK)).toBeNull());
      const retry = save.mock.calls[3][0] as Record<string, unknown>;
      expect(retry).toMatchObject({ rating: "down", shared: false });
      expect(retry).not.toHaveProperty("answerText");
      expect(bad()).toHaveAttribute("aria-pressed", "true");
      expect(capture).toHaveBeenCalledTimes(2);
    });

    it("reverts when the retry fails too", async () => {
      await tickThenRate();
      save.mockResolvedValueOnce({ ok: false, error: "sharing_off" });
      save.mockResolvedValueOnce({ ok: false, error: "failed" });
      await userEvent.click(bad());

      await waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith("Couldn't save your rating"),
      );
      expect(good()).toHaveAttribute("aria-pressed", "true");
      // The 403 wrote nothing, so the row is still shared and the student can untick
      expect(screen.getByLabelText(TICK)).toBeChecked();
      expect(capture).toHaveBeenCalledTimes(1);
    });
  });

  it("announces failures and says so when unticking fails", async () => {
    const announce = jest.fn();
    renderRating({ announce });
    await userEvent.click(good());
    await userEvent.click(await screen.findByLabelText(TICK));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
    save.mockResolvedValue({ ok: false, error: "failed" });
    await userEvent.click(screen.getByLabelText(TICK));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Couldn't stop sharing this answer",
      ),
    );
    expect(announce).toHaveBeenCalledWith("Couldn't stop sharing this answer");
    expect(screen.getByLabelText(TICK)).toBeChecked();
  });

  it("restores its state from memory after the sheet remounts", async () => {
    const memory = createRatingStore();
    const first = renderRating({ memory });
    await userEvent.click(good());
    await userEvent.click(await screen.findByLabelText(TICK));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
    first.unmount();
    jest.clearAllMocks();

    renderRating({ memory });
    expect(good()).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText(TICK)).toBeChecked();
    await userEvent.click(good());

    expect(save).not.toHaveBeenCalled();
    expect(capture).not.toHaveBeenCalled();
  });
});
