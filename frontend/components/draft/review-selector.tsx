"use client";

import { useState, useEffect } from "react";
import { Check } from "lucide-react";

type Reviewer = {
  id: number;
  username: string;
  email: string;
};

type ReviewerSelectorProps = {
  selectedReviewers: number[];
  onSelectionChange: (reviewerIds: number[]) => void;
};

export function ReviewerSelector({
  selectedReviewers,
  onSelectionChange,
}: ReviewerSelectorProps) {
  const [reviewers, setReviewers] = useState<Reviewer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchReviewers = async () => {
      try {
        // Replace with your actual API endpoint
        const response = await fetch("/api/reviewers");
        if (!response.ok) throw new Error("Failed to fetch reviewers");
        const data = await response.json();
        setReviewers(data.reviewers || []);
      } catch (error) {
        console.error("Error fetching reviewers:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReviewers();
  }, []);

  const toggleReviewer = (reviewerId: number) => {
    if (selectedReviewers.includes(reviewerId)) {
      onSelectionChange(selectedReviewers.filter((id) => id !== reviewerId));
    } else {
      onSelectionChange([...selectedReviewers, reviewerId]);
    }
  };

  if (isLoading) {
    return (
      <div className="py-4 text-center text-sm text-slate-500 dark:text-slate-400">
        Loading reviewers...
      </div>
    );
  }

  if (reviewers.length === 0) {
    return (
      <div className="py-4 text-center text-sm text-slate-500 dark:text-slate-400">
        No content editors available
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
        Select reviewers:
      </p>
      <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-slate-200 p-2 dark:border-slate-700">
        {reviewers.map((reviewer) => {
          const isSelected = selectedReviewers.includes(reviewer.id);
          return (
            <button
              key={reviewer.id}
              type="button"
              onClick={() => toggleReviewer(reviewer.id)}
              className={`flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm transition-colors ${
                isSelected
                  ? "bg-sky-100 text-sky-900 dark:bg-sky-900 dark:text-sky-100"
                  : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              <div className="flex flex-col">
                <span className="font-medium">{reviewer.username}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {reviewer.email}
                </span>
              </div>
              {isSelected && (
                <Check className="h-4 w-4 text-sky-600 dark:text-sky-400" />
              )}
            </button>
          );
        })}
      </div>
      {selectedReviewers.length > 0 && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {selectedReviewers.length} reviewer{selectedReviewers.length !== 1 ? "s" : ""} selected
        </p>
      )}
    </div>
  );
}