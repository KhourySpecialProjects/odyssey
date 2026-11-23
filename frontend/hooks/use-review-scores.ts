"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { reviewFailureMessage } from "@/lib/review-panel/failure-message";
import { useSharedReviewComments } from "@/components/draft/review/review-comments-context";
import {
  acceptAiScores,
  saveReviewScore,
  unconfirmScores,
  type ReviewActionResult,
} from "@/lib/requests/reviews";
import type { PanelScore } from "@/lib/review-panel/model";

/** A scope is one lesson's id, or "overall" for the Overall Score */
export type ScopeKey = number | "overall";

type Saved = { key: string; value: number | null };

const scopeOf = (lessonId: number | null): ScopeKey => lessonId ?? "overall";
const inScope = (s: PanelScore, lessonId: number | null) =>
  s.lessonId === lessonId;
const same = (a: PanelScore, lessonId: number | null, criterionId: number) =>
  a.lessonId === lessonId && a.criterionId === criterionId;

/** "<reviewId>:<lessonId|overall>:<criterionId>" */
function parseKey(key: string) {
  const [, section, criterion] = key.split(":");
  return {
    lessonId: section === "overall" ? null : Number(section),
    criterionId: Number(criterion),
  };
}

/** Applies the values a write returned onto the matching rows */
function reconcile(scores: PanelScore[], saved: Saved[]): PanelScore[] {
  return scores.map((s) => {
    const hit = saved.find((x) => {
      const k = parseKey(x.key);
      return same(s, k.lessonId, k.criterionId);
    });
    return hit ? { ...s, value: hit.value } : s;
  });
}

/** The scores with Confirm, Undo and Change (ODY-805 D4): optimistic, rolled back with a toast. */
export function useReviewScores(serverScores: PanelScore[]) {
  const shared = useSharedReviewComments();
  const ensureReview = shared?.ensureReview;
  const [local, setLocal] = useState({
    from: serverScores,
    scores: serverScores,
  });
  const [pendingScope, setPendingScope] = useState<ReadonlySet<ScopeKey>>(
    new Set(),
  );
  const busy = useRef(new Set<string>());
  // Identifies the server props the local scores belong to
  const source = useRef(serverScores);

  if (local.from !== serverScores) {
    source.current = serverScores;
    setLocal({ from: serverScores, scores: serverScores });
    setPendingScope(new Set());
    busy.current.clear();
  }
  const scores = local.scores;
  const scoresRef = useRef(scores);
  scoresRef.current = scores;

  const setScores = useCallback(
    (update: (current: PanelScore[]) => PanelScore[]) =>
      setLocal((l) => ({ ...l, scores: update(l.scores) })),
    [],
  );

  /** Shows `optimistic`, runs `save`, and on a refusal puts `restore` back */
  const run = useCallback(
    async (
      busyKey: string,
      scope: ScopeKey,
      failure: string,
      optimistic: (current: PanelScore[]) => PanelScore[],
      restore: (current: PanelScore[]) => PanelScore[],
      save: (reviewId: number) => Promise<ReviewActionResult<Saved | Saved[]>>,
    ) => {
      if (busy.current.has(busyKey)) return;
      busy.current.add(busyKey);
      setPendingScope((p) => new Set(p).add(scope));
      setScores(optimistic);
      const generation = source.current;
      let saved: Saved[] | null = null;
      let refused: { error: string; message?: string | null } | null = null;
      try {
        const opened = ensureReview
          ? await ensureReview()
          : ({ ok: false, error: "failed" } as const);
        if (opened.ok) {
          const result = await save(opened.data.id);
          if (result.ok) saved = [result.data].flat();
          else refused = result;
        } else {
          refused = opened;
        }
      } catch (error) {
        console.error("Review score write failed", error);
      }
      // New server props arrived meanwhile: they are the truth
      if (generation !== source.current) return;
      busy.current.delete(busyKey);
      setPendingScope((p) => {
        const next = new Set(p);
        next.delete(scope);
        return next;
      });
      if (saved) {
        const rows = saved;
        setScores((current) => reconcile(current, rows));
      } else {
        setScores(restore);
        toast.error(refused ? reviewFailureMessage(refused, failure) : failure);
      }
    },
    [ensureReview, setScores],
  );

  const confirm = useCallback(
    (lessonId: number | null) => {
      const before = scoresRef.current.filter((s) => inScope(s, lessonId));
      return run(
        `scope:${scopeOf(lessonId)}`,
        scopeOf(lessonId),
        "Couldn't confirm the scores. Try again.",
        (cur) =>
          cur.map((s) =>
            inScope(s, lessonId) ? { ...s, value: s.value ?? s.aiValue } : s,
          ),
        (cur) =>
          cur.map(
            (s) => before.find((b) => same(b, s.lessonId, s.criterionId)) ?? s,
          ),
        (id) => acceptAiScores(id, lessonId),
      );
    },
    [run],
  );

  const undo = useCallback(
    (lessonId: number | null) => {
      const before = scoresRef.current.filter((s) => inScope(s, lessonId));
      return run(
        `scope:${scopeOf(lessonId)}`,
        scopeOf(lessonId),
        "Couldn't undo the confirmation. Try again.",
        (cur) =>
          cur.map((s) =>
            inScope(s, lessonId) && s.value === s.aiValue
              ? { ...s, value: null }
              : s,
          ),
        (cur) =>
          cur.map(
            (s) => before.find((b) => same(b, s.lessonId, s.criterionId)) ?? s,
          ),
        (id) => unconfirmScores(id, lessonId),
      );
    },
    [run],
  );

  const change = useCallback(
    (criterionId: number, lessonId: number | null, value: number) => {
      const before = scoresRef.current.find((s) =>
        same(s, lessonId, criterionId),
      );
      return run(
        `score:${scopeOf(lessonId)}:${criterionId}`,
        scopeOf(lessonId),
        "Couldn't save the score. Try again.",
        (cur) =>
          before
            ? cur.map((s) =>
                same(s, lessonId, criterionId) ? { ...s, value } : s,
              )
            : [...cur, { lessonId, criterionId, value, aiValue: null }],
        (cur) =>
          before
            ? cur.map((s) => (same(s, lessonId, criterionId) ? before : s))
            : cur.filter((s) => !same(s, lessonId, criterionId)),
        (id) => saveReviewScore({ reviewId: id, lessonId, criterionId, value }),
      );
    },
    [run],
  );

  return { scores, confirm, undo, change, pendingScope };
}
