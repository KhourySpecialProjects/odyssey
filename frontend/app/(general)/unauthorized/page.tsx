import {
  Message,
  MessageActions,
  MessageDescription,
  MessageHeader,
} from "@/components/message";
import { Button } from "@/components/ui/button";
import { authOptions } from "@/lib/auth/options";
import { ArrowRightIcon } from "lucide-react";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function UnauthorizedRoute() {

  return (
    <Message>
      <MessageHeader subtitle="Error" title="Unauthorized" />
      <MessageDescription>
        You do not have permission to access this application.
      </MessageDescription>
      <MessageActions>
        <Button size="lg" after={<ArrowRightIcon />} asChild>
          <Link href="/request-access">Request Access</Link>
        </Button>
        <Button size="lg" variant="link" after={<ArrowRightIcon />} asChild>
          <Link href="/explore">Explore the Odyssey</Link>
        </Button>
      </MessageActions>
    </Message>
  );
}
