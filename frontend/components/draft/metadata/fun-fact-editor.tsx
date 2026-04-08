"use client";

import { IconTrash } from "@tabler/icons-react";
import { useState } from "react";

export function FunFactEditor({
  funFact,
  generateFact,
  deleteFact,
}: {
  funFact: string;
  generateFact: () => Promise<string>;
  deleteFact: () => void;
}) {
  const [currentFact, setCurrentFact] = useState(funFact);
  const [isGenerateLoading, setIsGenerateLoading] = useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateFact = async () => {
    setIsGenerateLoading(true);
    setError(null);
    try {
      const newFact = await generateFact();
      setCurrentFact(newFact);
    } catch (error) {
      console.error("Failed to generate fun fact:", error);
      setError(
        error instanceof Error ? error.message : "Failed to generate fun fact",
      );
    } finally {
      setIsGenerateLoading(false);
    }
  };

  const handleDeleteFact = async () => {
    setIsDeleteLoading(true);
    try {
      await deleteFact();
    } catch (error) {
      console.error("Failed to delete fun fact:", error);
    } finally {
      setCurrentFact("");
      setIsDeleteLoading(false);
    }
  };

  return (
    <section className="w-full">
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
        Fun Fact
      </h2>
      <p className="mt-1 text-slate-600 dark:text-slate-300">
        Generated from your overview by Anthropic's Claude AI, this fact will be
        displayed to users on Odyssey's homepage
      </p>

      <div className="mt-4 mb-4 w-full rounded-lg border border-[#D0D5DD] bg-[#fcfcfd] p-8 dark:border-slate-600 dark:bg-slate-800">
        <div
          className={`prose prose-sky prose-code:text-inherit prose-strong:text-inherit prose-headings:text-inherit dark:text-slate-300 ${currentFact ? "" : "text-[#121216] dark:text-slate-500"}`}
        >
          {currentFact ? currentFact : "Nothing here yet..."}
        </div>
      </div>

      <div className="flex flex-row items-center justify-end gap-2">
        <button
          onClick={handleGenerateFact}
          disabled={isGenerateLoading}
          className="flex h-10 items-center justify-center rounded-lg border border-[#D0D5DD] bg-white px-4 text-sm font-medium text-[#344054] transition-colors hover:border-slate-400 disabled:pointer-events-none disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
        >
          {isGenerateLoading
            ? "Generating..."
            : currentFact
              ? "Regenerate Fact"
              : "Generate Fact"}
        </button>
        <button
          onClick={handleDeleteFact}
          disabled={isDeleteLoading}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-red-200 text-red-500 transition-colors hover:bg-red-50 disabled:pointer-events-none disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
        >
          {isDeleteLoading ? (
            "..."
          ) : (
            <IconTrash className="h-4 w-4" stroke={1.8} />
          )}
        </button>
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </section>
  );
}
