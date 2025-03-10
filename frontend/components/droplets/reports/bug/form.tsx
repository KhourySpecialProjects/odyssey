"use client";

import { PERMITTED_EMAIL_DOMAINS } from "@/lib/globals";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createBugReport } from "@/lib/actions";
import { reportSchema } from "@/lib/validations/report";
import { ArrowRightIcon, LoaderIcon } from "lucide-react";
import { redirect, usePathname } from "next/navigation";

type Props = {
  name?: string | null;
  email?: string | null;
  onSuccess: () => void;
};

export function ReportBugForm({ name, email, onSuccess }: Props) {
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof reportSchema>>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      fullName: name ?? "",
      email: email ?? "",
      path: pathname ?? "Unknown",
      description: "",
    },
  });

  function onSubmit(values: z.infer<typeof reportSchema>) {
    startTransition(() => {
      createBugReport(values).then((r) => {
        if (r && !r.ok) {
          toast.error("Uh oh! Something went wrong.", {
            description: r.error || "",
          });
        } else {
          onSuccess();
          toast.success("Your report has been successfully submitted.");
          redirect(values.path + "?ts=" + Date.now());
        }
      });
    });
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
      >
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="John Doe"
                  type="text"
                  autoComplete="name"
                  disabled={!!name}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  placeholder="f.last@northeastern.edu"
                  type="email"
                  autoComplete="email"
                  disabled={!!email}
                  {...field}
                />
              </FormControl>
              {!email ? (
                <FormDescription>
                  The following email domains are supported:{" "}
                  {PERMITTED_EMAIL_DOMAINS.join(", ")}
                </FormDescription>
              ) : null}
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="sm:col-span-2">
          <FormField
            control={form.control}
            name="path"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Path</FormLabel>
                <FormControl>
                  <Input type="text" disabled {...field} />
                </FormControl>
                {!email ? (
                  <FormDescription>
                    The following email domains are supported:{" "}
                    {PERMITTED_EMAIL_DOMAINS.join(", ")}
                  </FormDescription>
                ) : null}
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="sm:col-span-2">
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Tell us about the issue..."
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Please explain the issue in detail.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="sm:col-span-2">
          <Button
            type="submit"
            after={isPending ? <LoaderIcon /> : <ArrowRightIcon />}
            className="w-full"
            disabled={isPending}
          >
            Submit Report
          </Button>
        </div>
      </form>
    </Form>
  );
}
