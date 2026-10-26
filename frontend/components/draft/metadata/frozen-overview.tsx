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
  /** Display names of the droplet's authors. */
  authorNames: string[];
};

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
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
        {title}
      </h2>
      <div className="mt-3 text-slate-700 dark:text-slate-300">{children}</div>
    </section>
  );
}

/**
 * The draft Overview as plain, read-only content. Shown in place of the
 * editors while the droplet is in review and the caller can't change it. It
 * is its own view rather than a `readOnly` flag threaded through every editor.
 */
export function FrozenOverview({ droplet, authorNames }: FrozenOverviewProps) {
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

        <h1 className="mt-6 text-[2.5rem] font-bold text-slate-900 dark:text-white">
          {droplet.name}
        </h1>
        {droplet.description ? (
          <p className="mt-3 text-pretty text-slate-500 md:text-xl/relaxed dark:text-slate-300">
            {stripHtmlTags(droplet.description)}
          </p>
        ) : null}
      </div>

      <div className="w-full space-y-10 px-40 pt-6">
        <Section title="Author(s)">
          {authorNames.length > 0 ? (
            <ul className="list-disc pl-5">
              {authorNames.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          ) : (
            <p>No authors listed.</p>
          )}
        </Section>

        {droplet.overview ? (
          <Section title="Overview">
            <div
              className="prose prose-sky prose-code:text-inherit prose-strong:text-inherit prose-headings:text-inherit max-w-none dark:text-slate-300"
              dangerouslySetInnerHTML={{
                __html: createDOMPurifier.sanitize(droplet.overview),
              }}
            />
          </Section>
        ) : null}

        <Section title="Learning Objectives">
          {objectives.length > 0 ? (
            <ul className="list-disc pl-5">
              {objectives.map((objective) => (
                <li key={objective.id}>{objective.objective}</li>
              ))}
            </ul>
          ) : (
            <p>None yet.</p>
          )}
        </Section>

        <Section title="Next Steps">
          {nextSteps.length > 0 ? (
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
          )}
        </Section>

        <Section title="Recommended Background">
          {prerequisites.length > 0 ? (
            <ul className="list-disc pl-5">
              {prerequisites.map((d) => (
                <li key={d.id}>{d.name}</li>
              ))}
            </ul>
          ) : (
            <p>None yet.</p>
          )}
        </Section>

        <Section title="Similar Droplets">
          {postrequisites.length > 0 ? (
            <ul className="list-disc pl-5">
              {postrequisites.map((d) => (
                <li key={d.id}>{d.name}</li>
              ))}
            </ul>
          ) : (
            <p>None yet.</p>
          )}
        </Section>

        <Section title="Fun Fact">
          {droplet.funFact ? <p>{droplet.funFact}</p> : <p>None yet.</p>}
        </Section>

        <Section title="Datasets">
          {datasets.length > 0 ? (
            <ul className="list-disc pl-5">
              {datasets.map((dataset) => (
                <li key={dataset.id}>{dataset.name}</li>
              ))}
            </ul>
          ) : (
            <p>None yet.</p>
          )}
        </Section>
      </div>
    </div>
  );
}
