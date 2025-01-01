import {
  Message,
  MessageActions,
  MessageDescription,
  MessageHeader,
} from "@/components/message";
import { Button } from "@/components/ui/button";
import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";

//TODO Update routing to take advantage of a more robust not-found page.
export default async function CantAccessRoute() {
  const user = await getCurrentUser();
  const authorizedUser = user?.email
    ? await getAuthorizedUserByEmail(user.email)
    : null;

  if (!user) {
    return (
      <Message>
        <MessageHeader
          subtitle="Access Required"
          title="Welcome to Khoury Odyssey"
        />
        <MessageDescription>
          Please sign in or request access to view this content.
        </MessageDescription>
        <MessageActions>
          <Button size="lg" after={<ArrowRightIcon />} asChild>
            <Link href="/api/auth/signin">Sign In</Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            after={<ArrowRightIcon />}
            asChild
          >
            <Link href="/request-access">Request Access</Link>
          </Button>
        </MessageActions>
      </Message>
    );
  }

  if (!authorizedUser) {
    return (
      <Message>
        <MessageHeader
          subtitle="Almost There!"
          title="Join the Khoury Odyssey Community"
        />
        <MessageDescription>
          Thanks for your interest! While you&apos;re signed in, you&apos;ll
          need to request access to view this content. Join our growing
          community of learners today!
        </MessageDescription>
        <MessageActions>
          <Button size="lg" after={<ArrowRightIcon />} asChild>
            <Link href="/request-access">Request Access</Link>
          </Button>
        </MessageActions>
      </Message>
    );
  }

  return (
    <Message>
      <MessageHeader subtitle="404" title="Page Not Found" />
      <MessageDescription>
        The requested resource does not exist, or you do not have access to it!
      </MessageDescription>
      <MessageActions>
        <Button size="lg" after={<ArrowRightIcon />} asChild>
          <Link href="/">Start Over</Link>
        </Button>
      </MessageActions>
    </Message>
  );
}
