"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { IconKeyboard } from "@tabler/icons-react";

/**
 * A comment layer as the keyboard sees it (ODY-806, R-D6): its units (a
 * BlockNote block, or a paragraph of a read-only text) and what it does with
 * the keyboard's position.
 */
export interface KeyboardLayer {
  root: () => HTMLElement | null;
  /** How many units it has, and how many caret stops each */
  unitCount: () => number;
  stopCount: (unit: number) => number;
  /** Whether a unit takes whole-block comments, which Shift extends over */
  isBlock: (unit: number) => boolean;
  /** The stop Alt+← → jumps to */
  wordJump: (unit: number, stop: number, direction: 1 | -1) => number;
  /**
   * Shows the keyboard's position: a unit outlined (stop -1), a caret at a
   * stop, or a run of blocks; returns what a screen reader hears. Null clears
   * it.
   */
  show: (
    position: { unit: number; stop: number; through: number } | null,
  ) => string;
  /** Opens the composer there */
  comment: (position: { unit: number; stop: number; through: number }) => void;
}

type Position = { layer: number; unit: number; stop: number; through: number };

interface KeyboardContext {
  register: (layer: KeyboardLayer) => () => void;
  layers: () => KeyboardLayer[];
}

const CommentKeyboardContext = createContext<KeyboardContext | null>(null);

/** Holds the comment layers on a page, so one button reaches them all */
export function CommentKeyboardProvider({ children }: { children: ReactNode }) {
  const registered = useRef<KeyboardLayer[]>([]);
  const value = useMemo<KeyboardContext>(
    () => ({
      register: (layer) => {
        registered.current.push(layer);
        return () => {
          registered.current = registered.current.filter((l) => l !== layer);
        };
      },
      // In page order
      layers: () =>
        registered.current
          .filter((layer) => layer.root())
          .sort((a, b) =>
            a.root()!.compareDocumentPosition(b.root()!) &
            Node.DOCUMENT_POSITION_FOLLOWING
              ? -1
              : 1,
          ),
    }),
    [],
  );
  return (
    <CommentKeyboardContext.Provider value={value}>
      {children}
    </CommentKeyboardContext.Provider>
  );
}

/** Registers a comment layer with the page's keyboard, if there is one */
export function useKeyboardLayer(layer: KeyboardLayer, enabled: boolean) {
  const context = useContext(CommentKeyboardContext);
  const latest = useRef(layer);
  latest.current = layer;
  useEffect(() => {
    if (!context || !enabled) return;
    // Calls go to the latest props through the ref
    const proxy: KeyboardLayer = {
      root: () => latest.current.root(),
      unitCount: () => latest.current.unitCount(),
      stopCount: (u) => latest.current.stopCount(u),
      isBlock: (u) => latest.current.isBlock(u),
      wordJump: (u, s, d) => latest.current.wordJump(u, s, d),
      show: (p) => latest.current.show(p),
      comment: (p) => latest.current.comment(p),
    };
    return context.register(proxy);
  }, [context, enabled]);
}

const HINT =
  "Use the Up and Down arrows to choose a block, and Left and Right to move a caret through its text, or Option or Alt with Left and Right to jump by word. Shift with Up or Down takes several blocks. Press Enter to comment.";

/**
 * "Comment with the keyboard" (ODY-806, as the redesign prototype has it):
 * while it has focus, ↑ ↓ Home End choose a block, → enters its text, ← →
 * move the caret a letter (Alt+← → a word), Shift+↑ ↓ take several blocks,
 * Enter comments, and Esc leaves. A live region says where the caret is.
 */
export function CommentKeyboardButton() {
  const context = useContext(CommentKeyboardContext);
  const [message, setMessage] = useState("");
  const position = useRef<Position | null>(null);

  const layers = useCallback(() => context?.layers() ?? [], [context]);

  const show = useCallback(
    (next: Position | null) => {
      const all = layers();
      const previous = position.current;
      if (previous && (!next || previous.layer !== next.layer)) {
        all[previous.layer]?.show(null);
      }
      position.current = next;
      if (!next) return;
      const layer = all[next.layer];
      if (!layer) return;
      setMessage(layer.show(next));
    },
    [layers],
  );

  // Every unit across the page's layers, as [layer, unit]
  const flat = useCallback(() => {
    const out: [number, number][] = [];
    layers().forEach((layer, l) => {
      for (let u = 0; u < layer.unitCount(); u++) out.push([l, u]);
    });
    return out;
  }, [layers]);

  const moveTo = (index: number) => {
    const units = flat();
    if (units.length === 0) return;
    const [layer, unit] = units[Math.max(0, Math.min(units.length - 1, index))];
    show({ layer, unit, stop: -1, through: unit });
  };

  const indexOf = (p: Position) =>
    flat().findIndex(([l, u]) => l === p.layer && u === p.unit);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const p = position.current;
    const all = layers();
    const layer = p ? all[p.layer] : undefined;
    const k = e.key;
    if (k === "ArrowDown" || k === "ArrowUp" || k === "Home" || k === "End") {
      e.preventDefault();
      const units = flat();
      if (e.shiftKey && p && layer && (k === "ArrowDown" || k === "ArrowUp")) {
        // Extend a run of whole blocks within the layer
        const through = p.through + (k === "ArrowDown" ? 1 : -1);
        if (
          through >= 0 &&
          through < layer.unitCount() &&
          layer.isBlock(through) &&
          layer.isBlock(p.unit)
        ) {
          show({ ...p, stop: -1, through });
        }
        return;
      }
      const at = p ? indexOf({ ...p, unit: p.through }) : -1;
      moveTo(
        k === "Home"
          ? 0
          : k === "End"
            ? units.length - 1
            : at < 0
              ? 0
              : at + (k === "ArrowDown" ? 1 : -1),
      );
    } else if ((k === "ArrowRight" || k === "ArrowLeft") && p && layer) {
      e.preventDefault();
      const direction = k === "ArrowRight" ? 1 : -1;
      const count = layer.stopCount(p.unit);
      const stop = e.altKey
        ? layer.wordJump(p.unit, p.stop, direction)
        : p.stop + direction;
      show({
        ...p,
        stop: Math.max(-1, Math.min(count - 1, stop)),
        through: p.unit,
      });
    } else if ((k === "Enter" || k === " ") && p && layer) {
      e.preventDefault();
      layer.comment(p);
    } else if (k === "Escape" && p) {
      e.preventDefault();
      show(null);
      setMessage("");
    }
  };

  if (!context) return null;
  return (
    <>
      <button
        type="button"
        aria-describedby="comment-keyboard-hint"
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (!position.current) moveTo(0);
        }}
        onBlur={(e) => {
          // Into the composer, the position stays for when it closes
          const into = e.relatedTarget as Element | null;
          if (into?.closest("[data-comment-composer]")) return;
          show(null);
          setMessage("");
        }}
        className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-slate-700 hover:bg-white/60 focus-visible:ring-2 focus-visible:ring-[var(--rc-accent)] focus-visible:outline-none dark:text-slate-200 dark:hover:bg-white/10"
      >
        <IconKeyboard className="h-3.5 w-3.5" aria-hidden />
        Comment with the keyboard
      </button>
      <span id="comment-keyboard-hint" className="sr-only">
        {HINT}
      </span>
      <span className="sr-only" aria-live="polite">
        {message}
      </span>
    </>
  );
}
