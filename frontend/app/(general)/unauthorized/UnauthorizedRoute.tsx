import {
  Message,
  MessageActions,
  MessageDescription,
  MessageHeader,
} from "@/components/message";
import { AccessRequest } from "@/components/shared/access-manager/access-requests/access-requests";
import { Button } from "@/components/ui/button";
import { fetchAccessRequests } from "@/lib/requests/data";
import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";

interface UnauthorizedRouteProps {
  email: string;
}

export default async function UnauthorizedRoute({
  email,
}: UnauthorizedRouteProps) {
  const requests = await fetchAccessRequests();

  return (
    <Message>
      <MessageHeader subtitle="Error" title="Unauthorized" />
      {requests?.some((req: AccessRequest) => req.email === email) ? (
        <>
          <MessageDescription>
            {`We are currently processing a request for ${email}`}
          </MessageDescription>
          <MessageActions>
            <Button size="lg" variant="link" after={<ArrowRightIcon />} asChild>
              <Link href="/explore">Explore the Odyssey</Link>
            </Button>
          </MessageActions>
        </>
      ) : (
        <>
          <MessageDescription>
            You do not have permission to access this application. Please
            request access so that we can process your request!
          </MessageDescription>
          <MessageActions>
            <Button size="lg" after={<ArrowRightIcon />} asChild>
              <Link href="/request-access">Request Access</Link>
            </Button>
            <Button size="lg" variant="link" after={<ArrowRightIcon />} asChild>
              <Link href="/explore">Explore the Odyssey</Link>
            </Button>
          </MessageActions>
        </>
      )}
    </Message>
  );
}
