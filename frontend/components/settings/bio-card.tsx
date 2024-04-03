"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { updateAuthorBio } from "@/lib/actions";
import { BIO_MAX_LENGTH, BioFormSchema } from "@/lib/validations/author";
import { Author } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRightIcon, LoaderIcon } from "lucide-react";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

export function BioCard({ author }: { author: Author }) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof BioFormSchema>>({
    resolver: zodResolver(BioFormSchema),
    defaultValues: {
      bio: author.bio,
    },
  });

  function onSubmit(values: z.infer<typeof BioFormSchema>) {
    startTransition(() => {
      updateAuthorBio(values).then((r) => {
        if (r && !r.ok) {
          toast.error("Uh oh! Something went wrong.", {
            description: r.error || "",
          });
        } else {
          toast.success("Your bio has been successfully updated.");
        }
      });
    });
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        <Card>
          <CardHeader>
            <CardTitle>Bio</CardTitle>
            <CardDescription>
              Your public biography, shown on Droplets you authored.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      placeholder={`Tell us a little bit about yourself: ${author.name} is a...`}
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-right">
                    {field.value.length}/{BIO_MAX_LENGTH} characters
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>

          <CardFooter className="px-6 py-4 border-t">
            <Button
              type="submit"
              after={
                isPending ? (
                  <LoaderIcon className="animate-spin" />
                ) : (
                  <ArrowRightIcon />
                )
              }
            >
              Save
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
