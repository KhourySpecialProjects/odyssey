import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { CreationRequest } from "@/types";

type PendingRequestCardProps = {
  request: CreationRequest;
};

export function PendingRequestCard({ request }: PendingRequestCardProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-xl border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
        <CardHeader className="space-y-3 pb-6">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-black dark:bg-white">
              <Clock className="h-6 w-6 text-white dark:text-black" />
            </div>
            <CardTitle className="text-2xl font-bold text-black dark:text-white">
              Request Already Submitted
            </CardTitle>
          </div>
          <CardDescription className="text-base text-gray-600 dark:text-gray-400">
            Your content creator request is pending review.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-gray-800 dark:text-gray-200">
              You have already submitted a request to become a Content Creator. 
              An admin will review your request and respond soon.
            </p>
            <p className="text-gray-600 dark:text-gray-400">
              Check back later for an update on your request status.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}