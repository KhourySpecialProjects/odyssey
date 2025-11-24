"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Lightbulb } from "lucide-react";

export function ContentCreatorRequestForm() {
  const [motivation, setMotivation] = useState("");
  const [ideas, setIdeas] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      // Add your submission logic here
      // Example: await submitRequest({ motivation, ideas });
      console.log({ motivation, ideas });
      
      // Show success message
      alert("Request submitted successfully!");
    } catch (error) {
      console.error("Submission error:", error);
      alert("Failed to submit request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = motivation.trim().length > 0 && ideas.trim().length > 0;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <Card className="w-full max-w-2xl shadow-xl border-slate-200 dark:border-slate-800">
        <CardHeader className="space-y-3 pb-6">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">
              Request Content Creator Role
            </CardTitle>
          </div>
          <CardDescription className="text-base text-slate-600 dark:text-slate-400">
            Help us understand your goals and ideas for creating educational content on Odyssey.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="space-y-6">
            {/* Motivation Section */}
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <Lightbulb className="h-5 w-5 text-amber-500 mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <Label 
                    htmlFor="motivation" 
                    className="text-base font-semibold text-slate-900 dark:text-white"
                  >
                    Why do you want to create a droplet?
                  </Label>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Share your motivation and what you hope to achieve
                  </p>
                </div>
              </div>
              <Textarea
                id="motivation"
                value={motivation}
                onChange={(e) => setMotivation(e.target.value)}
                placeholder="I want to create educational content because..."
                className="min-h-[120px] resize-none border-slate-300 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-blue-500"
              />
              <p className="text-xs text-slate-500 dark:text-slate-500">
                {motivation.length} characters
              </p>
            </div>

            {/* Ideas Section */}
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <Sparkles className="h-5 w-5 text-purple-500 mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <Label 
                    htmlFor="ideas" 
                    className="text-base font-semibold text-slate-900 dark:text-white"
                  >
                    What are some ideas you have for a droplet?
                  </Label>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Describe the topics or concepts you'd like to teach
                  </p>
                </div>
              </div>
              <Textarea
                id="ideas"
                value={ideas}
                onChange={(e) => setIdeas(e.target.value)}
                placeholder="Some droplet ideas I have include..."
                className="min-h-[120px] resize-none border-slate-300 dark:border-slate-700 focus:border-purple-500 dark:focus:border-purple-500 focus:ring-purple-500"
              />
              <p className="text-xs text-slate-500 dark:text-slate-500">
                {ideas.length} characters
              </p>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <Button
                onClick={handleSubmit}
                disabled={!isFormValid || isSubmitting}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-6 text-base shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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