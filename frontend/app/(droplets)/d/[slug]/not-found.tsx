import {
  Message,
  MessageActions,
  MessageDescription,
  MessageHeader,
} from "@/components/message";
import { Button } from "@/components/ui/button";
import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";

export default function NotFoundRoute() {
  return (
    <Message>
      <MessageHeader subtitle="404" title="Page Not Found" />
      <MessageDescription>
        The requested lesson does not exist.
      </MessageDescription>
      <MessageActions>
        <Button size="lg" after={<ArrowRightIcon />} asChild>
          <Link href="./">Return to Home Page</Link>
        </Button>
      </MessageActions>
    </Message>
  );
}
