"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";

export function FunFactEditor({
    funFact,
    generateFact,
}: {
    funFact: string;
    generateFact: () => Promise<string>;
}) {
    const [currentFact, setCurrentFact] = useState(funFact);
    const [isLoading, setIsLoading] = useState(false);

    const handleGenerateFact = async () => {
        setIsLoading(true);
        try {
            const newFact = await generateFact();
            setCurrentFact(newFact);
        } catch (error) {
            console.error('Failed to generate fun fact:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <section className="w-full max-w-2xl">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                Fun Fact
            </h2>
            <p className="text-slate-500 dark:text-slate-300">
                This Anthropic AI-generated fact will be displayed to users on Odyssey's homepage
            </p>

            <div className="my-4 w-full rounded-md border border-slate-200 bg-slate-50 p-8 dark:border-slate-500 dark:bg-slate-800">
                <div className="prose prose-sky prose-code:text-inherit prose-strong:text-inherit prose-headings:text-inherit mx-auto dark:text-slate-300">
                    {currentFact}
                </div>
            </div>

            <Button 
                onClick={handleGenerateFact}
                disabled={isLoading}
            >
                {isLoading ? 'Generating...' : 'Regenerate Fact'}
            </Button>
        </section>
    );
}
