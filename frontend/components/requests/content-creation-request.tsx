"use client";
import { createCreationRequest } from "@/lib/actions";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Sparkles, Lightbulb } from "lucide-react";
import { AuthorizedUser } from "@/types";
import { toast } from "sonner";

export function ContentCreatorRequestForm({
  user,
}: {
  user: AuthorizedUser | undefined;
}) {
  const [motivation, setMotivation] = useState("");
  const [ideas, setIdeas] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user?.id) {
      toast.error("You must be logged in to submit a request.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createCreationRequest({
        motivation,
        dropletIdea: ideas,
        user: user.id,
      });

      if (result.ok) {
        toast.success("Request submitted successfully!");
        // Optionally redirect or clear the form
        setMotivation("");
        setIdeas("");
      } else {
        toast.error(`Failed to submit request: ${result.error}`);
      }
    } catch (error) {
      console.error("Submission error:", error);
      toast.error("Failed to submit request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = motivation.trim().length > 0 && ideas.trim().length > 0;

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-2xl border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-black">
        <CardHeader className="space-y-3 pb-6">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-black p-2 dark:bg-white">
              <Sparkles className="h-6 w-6 text-white dark:text-black" />
            </div>
            <CardTitle className="text-2xl font-bold text-black dark:text-white">
              Request Content Creator Role
            </CardTitle>
          </div>
          <CardDescription className="text-base text-gray-600 dark:text-gray-400">
            Help us understand your goals and ideas for creating educational
            content on Odyssey.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="space-y-6">
            {/* Motivation Section */}
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <Lightbulb className="mt-1 h-5 w-5 flex-shrink-0 text-black dark:text-white" />
                <div className="flex-1">
                  <Label
                    htmlFor="motivation"
                    className="text-base font-semibold text-black dark:text-white"
                  >
                    Why do you want to create?
                  </Label>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Share your motivation and what you hope to achieve
                  </p>
                </div>
              </div>
              <Textarea
                id="motivation"
                value={motivation}
                onChange={(e) => setMotivation(e.target.value)}
                placeholder="I want to create educational content because..."
                className="min-h-[120px] resize-none border-gray-300 bg-white text-black placeholder:text-gray-500 focus:border-black focus:ring-black dark:border-gray-700 dark:bg-black dark:text-white dark:placeholder:text-gray-500 dark:focus:border-white dark:focus:ring-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-500">
                {motivation.length} characters
              </p>
            </div>

            {/* Ideas Section */}
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <Sparkles className="mt-1 h-5 w-5 flex-shrink-0 text-black dark:text-white" />
                <div className="flex-1">
                  <Label
                    htmlFor="ideas"
                    className="text-base font-semibold text-black dark:text-white"
                  >
                    What are some ideas you have for a droplet?
                  </Label>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Describe the topics or concepts you'd like to teach
                  </p>
                </div>
              </div>
              <Textarea
                id="ideas"
                value={ideas}
                onChange={(e) => setIdeas(e.target.value)}
                placeholder="Some droplet ideas I have include..."
                className="min-h-[120px] resize-none border-gray-300 bg-white text-black placeholder:text-gray-500 focus:border-black focus:ring-black dark:border-gray-700 dark:bg-black dark:text-white dark:placeholder:text-gray-500 dark:focus:border-white dark:focus:ring-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-500">
                {ideas.length} characters
              </p>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <Button
                onClick={handleSubmit}
                disabled={!isFormValid || isSubmitting}
                className="w-full border border-black bg-black py-6 text-base font-semibold text-white shadow-lg transition-all duration-200 hover:bg-gray-900 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 dark:border-white dark:bg-white dark:text-black dark:hover:bg-gray-100"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent dark:border-black" />
                    Submitting Request...
                  </span>
                ) : (
                  "Submit Request"
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
