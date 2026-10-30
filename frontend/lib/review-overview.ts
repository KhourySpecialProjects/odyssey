import { stripHtmlTags } from "@/lib/utils";

/** The Overview fields a reviewer can comment on the text of */
export const OVERVIEW_TEXT_FIELDS = [
  "name",
  "description",
  "overview",
  "objective",
] as const;
export type OverviewTextField = (typeof OVERVIEW_TEXT_FIELDS)[number];

const escape = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

type OverviewSource = {
  name?: string | null;
  description?: string | null;
  overview?: string | null;
  objectives: string[];
};

/** Each Overview field as the page shows it: the HTML review comments anchor to. */
export function overviewFieldHtml(
  source: OverviewSource,
  opts: { titleClass?: string } = {},
): Record<OverviewTextField, string> {
  return {
    name: `<h1 class="${opts.titleClass ?? ""}">${escape(source.name ?? "")}</h1>`,
    description: `<p>${escape(stripHtmlTags(source.description ?? ""))}</p>`,
    overview: source.overview ?? "",
    objective: `<ul class="list-disc pl-5">${source.objectives
      .map((o) => `<li>${escape(o)}</li>`)
      .join("")}</ul>`,
  };
}
