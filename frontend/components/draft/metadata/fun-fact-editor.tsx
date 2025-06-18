"use client";

import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
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
      setError(error instanceof Error ? error.message : "Failed to generate fun fact");
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
    <section className="w-full max-w-2xl">
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
        Fun Fact
      </h2>
      <p className="text-slate-500 dark:text-slate-300">
        This Anthropic's Claude-generated fact will be displayed to users on Odyssey's
        homepage
      </p>

      <div className="my-4 w-full rounded-md border border-slate-200 bg-slate-50 p-8 dark:border-slate-500 dark:bg-slate-800">
        <div
          className={`prose prose-sky prose-code:text-inherit prose-strong:text-inherit prose-headings:text-inherit mx-auto dark:text-slate-300 ${currentFact ? "" : "text-slate-500 dark:text-slate-500"}`}
        >
          {currentFact ? currentFact : "Nothing here yet..."}
        </div>
      </div>

      <div className="flex flex-row items-center gap-2">
        <Button onClick={handleGenerateFact} disabled={isGenerateLoading}>
          {isGenerateLoading
            ? "Generating..."
            : currentFact
              ? "Regenerate Fact"
              : "Generate Fact"}
        </Button>
        <Button variant="destructive" onClick={handleDeleteFact}>
          {isDeleteLoading ? "Deleting..." : <X />}
        </Button>
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </section>
  );
}
