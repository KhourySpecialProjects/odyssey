"use client";

import React, { useEffect, useRef } from "react";
import DOMPurify from "isomorphic-dompurify";
import hljs from "highlight.js";

interface RenderedContentProps extends React.HTMLAttributes<HTMLDivElement> {
  html: string;
}

/**
 * Renders sanitized HTML and post-processes fenced code blocks to match the
 * editor's CodeBlockComponent exactly: syntax highlighting via highlight.js
 * and a line-number gutter with 1.25rem line height on both sides.
 *
 * Critical layout values (padding, top, lineHeight) are set as inline styles
 * so Tailwind Typography cannot override them regardless of prose context.
 */
export function RenderedContent({ html, ...divProps }: RenderedContentProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = DOMPurify.sanitize(html);

    ref.current.querySelectorAll("pre").forEach((pre) => {
      const code = pre.querySelector("code");
      if (!code) return;

      const rawText = code.textContent ?? "";
      const lines = rawText.split("\n");
      if (lines[lines.length - 1] === "") lines.pop();

      const langClass = Array.from(code.classList).find((c) =>
        c.startsWith("language-"),
      );
      const lang = langClass?.replace("language-", "");

      let highlightedHtml: string;
      try {
        highlightedHtml = lang
          ? hljs.highlight(rawText, { language: lang }).value
          : hljs.highlightAuto(rawText).value;
      } catch {
        highlightedHtml = rawText
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
      }

      // --- new <pre> ---
      // Inline styles own all layout so Typography can never shift them.
      // Tailwind classes only provide colors/border (lower stakes).
      const newPre = document.createElement("pre");
      newPre.className =
        "rounded-b-md rounded-tl-md border border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-900";
      newPre.style.position = "relative";
      newPre.style.margin = "0";
      newPre.style.overflowX = "auto";
      newPre.style.paddingTop = "0.75rem";
      newPre.style.paddingBottom = "0.75rem";
      newPre.style.paddingRight = "1rem";
      newPre.style.paddingLeft = "3rem";

      // --- gutter ---
      // top/bottom match pre's inline padding so numbers align with code lines.
      const gutter = document.createElement("div");
      gutter.className =
        "flex min-w-[2.5rem] flex-col border-r border-gray-200 bg-gray-100 text-sm text-gray-400 select-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400";
      gutter.style.position = "absolute";
      gutter.style.top = "0.75rem";
      gutter.style.bottom = "0.75rem";
      gutter.style.left = "0";

      lines.forEach((_, i) => {
        const lineEl = document.createElement("div");
        lineEl.className = "pr-2 text-right font-mono";
        lineEl.style.lineHeight = "1.25rem";
        lineEl.style.height = "1.25rem";
        lineEl.textContent = String(i + 1);
        gutter.appendChild(lineEl);
      });

      // --- code ---
      const newCode = document.createElement("code");
      newCode.className =
        "font-mono text-sm whitespace-pre text-gray-800 dark:text-slate-50 hljs";
      if (lang) newCode.classList.add(`language-${lang}`);
      newCode.style.display = "block";
      newCode.style.margin = "0";
      newCode.style.padding = "0";
      newCode.style.lineHeight = "1.25rem";
      newCode.innerHTML = highlightedHtml;

      newPre.appendChild(gutter);
      newPre.appendChild(newCode);

      const wrapper = document.createElement("div");
      wrapper.className = "not-prose my-2";
      wrapper.appendChild(newPre);

      pre.parentNode?.replaceChild(wrapper, pre);
    });
  }, [html]);

  return <div ref={ref} {...divProps} />;
}
