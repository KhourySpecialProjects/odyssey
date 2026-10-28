import createDOMPurifier from "isomorphic-dompurify";
import { Badge } from "@/components/ui/badge";
import { getTagColors } from "@/lib/tag-colors";
import { cn, stripHtmlTags, uppercaseFirstChar } from "@/lib/utils";
import type { Droplet } from "@/types";

type FrozenOverviewProps = {
  droplet: Pick<
    Droplet,
    | "name"
    | "description"
    | "overview"
    | "focusArea"
    | "type"
    | "difficulty"
    | "tags"
    | "learningObjectives"
    | "nextSteps"
    | "prerequisites"
    | "postrequisites"
    | "funFact"
    | "datasets"
  >;
  /** The droplet's authors. Empty when they couldn't be loaded. */
  authors: { id: number; name: string }[];
  /**
   * Replaces how a field a reviewer comments on the text of is shown
   * (ODY-806): the title, the description, the overview text, or the
   * learning objectives. Given the default.
   */
  renderField?: (
    field: OverviewField,
    standard: React.ReactNode,
  ) => React.ReactNode;
  /**
   * Replaces how a section is shown, heading and all (ODY-806: a reviewer
   * comments on a whole section from its heading). Given the default.
   */
  renderSection?: (
    section: OverviewSection,
    title: string,
    body: React.ReactNode,
    standard: React.ReactNode,
  ) => React.ReactNode;
};

/** The Overview fields a reviewer can comment on the text of */
export type OverviewField = "name" | "description" | "overview" | "objective";

/** The Overview's sections, each of which takes whole-section comments */
export type OverviewSection =
  | "authors"
  | "overview"
  | "objective"
  | "nextSteps"
  | "prerequisites"
  | "postrequisites"
  | "funFact"
  | "datasets";

export const TITLE_CLASS =
  "text-[2.5rem] font-bold text-slate-900 dark:text-white";
export const SECTION_HEADING_CLASS =
  "text-2xl font-bold text-slate-900 dark:text-white";
export const SECTION_BODY_CLASS = "mt-3 text-slate-700 dark:text-slate-300";

function Pill({ name }: { name: string }) {
  const colors = getTagColors(name);
  return (
    <Badge
      variant="outline"
      className={cn("rounded-[16px] border-0", colors.bg, colors.text)}
    >
      {uppercaseFirstChar(name)}
    </Badge>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="w-full">
      <h2 className={SECTION_HEADING_CLASS}>{title}</h2>
      <div className={SECTION_BODY_CLASS}>{children}</div>
    </section>
  );
}

/**
 * The draft Overview as plain, read-only content. Shown in place of the
 * editors while the droplet is in review and the caller can't change it. It
 * is its own view rather than a `readOnly` flag threaded through every editor.
 */
export function FrozenOverview({
  droplet,
  authors,
  renderField = (_field, standard) => standard,
  renderSection = (_section, _title, _body, standard) => standard,
}: FrozenOverviewProps) {
  const section = (
    name: OverviewSection,
    title: string,
    body: React.ReactNode,
  ) =>
    renderSection(name, title, body, <Section title={title}>{body}</Section>);
  const tags = droplet.tags ?? [];
  const objectives = droplet.learningObjectives ?? [];
  const nextSteps = droplet.nextSteps ?? [];
  const prerequisites = droplet.prerequisites ?? [];
  const postrequisites = droplet.postrequisites ?? [];
  const datasets = droplet.datasets ?? [];

  return (
    <div data-testid="frozen-overview">
      <div className="px-40">
        <div className="flex flex-row flex-wrap gap-1.5">
          <Pill name={droplet.focusArea} />
          <Pill name={droplet.type} />
          {droplet.difficulty ? <Pill name={droplet.difficulty} /> : null}
          {tags.map((tag) => (
            <Pill key={tag.id} name={tag.name} />
          ))}
        </div>

        <div className="mt-6">
          {renderField("name", <h1 className={TITLE_CLASS}>{droplet.name}</h1>)}
        </div>
        {droplet.description ? (
          <div className="mt-3 text-pretty text-slate-500 md:text-xl/relaxed dark:text-slate-300">
            {renderField(
              "description",
              <p>{stripHtmlTags(droplet.description)}</p>,
            )}
          </div>
        ) : null}
      </div>

      <div className="w-full space-y-10 px-40 pt-6">
        {section(
          "authors",
          "Author(s)",
          authors.length > 0 ? (
            <ul className="list-disc pl-5">
              {authors.map((author) => (
                <li key={author.id}>{author.name}</li>
              ))}
            </ul>
          ) : (
            <p>No authors listed.</p>
          ),
        )}

        {droplet.overview
          ? section(
              "overview",
              "Overview",
              <div className="prose prose-sky prose-code:text-inherit prose-strong:text-inherit prose-headings:text-inherit max-w-none dark:text-slate-300">
                {renderField(
                  "overview",
                  <div
                    dangerouslySetInnerHTML={{
                      __html: createDOMPurifier.sanitize(droplet.overview),
                    }}
                  />,
                )}
              </div>,
            )
          : null}

        {section(
          "objective",
          "Learning Objectives",
          objectives.length > 0 ? (
            renderField(
              "objective",
              <ul className="list-disc pl-5">
                {objectives.map((objective) => (
                  <li key={objective.id}>{objective.objective}</li>
                ))}
              </ul>,
            )
          ) : (
            <p>None yet.</p>
          ),
        )}

        {section(
          "nextSteps",
          "Next Steps",
          nextSteps.length > 0 ? (
            <ul className="list-disc pl-5">
              {nextSteps.map((step) => (
                <li key={step.id}>
                  <a
                    href={step.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-700 underline dark:text-sky-400"
                  >
                    {step.label || step.url}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p>None yet.</p>
          ),
        )}

        {section(
          "prerequisites",
          "Recommended Background",
          prerequisites.length > 0 ? (
            <ul className="list-disc pl-5">
              {prerequisites.map((d) => (
                <li key={d.id}>{d.name}</li>
              ))}
            </ul>
          ) : (
            <p>None yet.</p>
          ),
        )}

        {section(
          "postrequisites",
          "Similar Droplets",
          postrequisites.length > 0 ? (
            <ul className="list-disc pl-5">
              {postrequisites.map((d) => (
                <li key={d.id}>{d.name}</li>
              ))}
            </ul>
          ) : (
            <p>None yet.</p>
          ),
        )}

        {section(
          "funFact",
          "Fun Fact",
          droplet.funFact ? <p>{droplet.funFact}</p> : <p>None yet.</p>,
        )}

        {section(
          "datasets",
          "Datasets",
          datasets.length > 0 ? (
            <ul className="list-disc pl-5">
              {datasets.map((dataset) => (
                <li key={dataset.id}>{dataset.name}</li>
              ))}
            </ul>
          ) : (
            <p>None yet.</p>
          ),
        )}
      </div>
    </div>
  );
}
