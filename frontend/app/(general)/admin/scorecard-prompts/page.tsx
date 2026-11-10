import { PromptEditor } from "@/components/admin/scorecard-prompts/prompt-editor";
import {
  loadStoredPrompt,
  resolvePrompt,
} from "@/lib/ai-review/prompt-settings";

export const dynamic = "force-dynamic";

async function loadResolved() {
  try {
    return resolvePrompt(await loadStoredPrompt());
  } catch {
    return null;
  }
}

export default async function Page() {
  const resolved = await loadResolved();

  return (
    <div className="w-full px-4 py-4 md:px-[56px] md:py-8">
      <div className="mb-6">
        <h1 className="text-4xl leading-tight font-semibold text-black dark:text-white">
          Scorecard Prompts
        </h1>
        <p className="mt-3 text-sm text-[#475569] md:text-[20px] dark:text-slate-400">
          What Score with AI is told when it grades a droplet. Changes apply to
          the next run.
        </p>
      </div>

      {resolved ? (
        <PromptEditor initial={resolved.parts} custom={resolved.custom} />
      ) : (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load the Scorecard prompts. Refresh to try again.
        </p>
      )}
    </div>
  );
}
