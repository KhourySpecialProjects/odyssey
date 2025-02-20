"use client";

import { Button } from "@/components/ui/button";
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
import { AuthorizedUser } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRightIcon, LoaderIcon } from "lucide-react";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

export function BioCard({ author }: { author: AuthorizedUser }) {
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="px-6 py-4 w-full">
        <div className="flex flex-row w-full gap-2 items-center">
          <FormField
            control={form.control}
            name="bio"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormControl>
                  <Textarea
                    placeholder={`Tell us a little bit about yourself: ${author.firstName} is a...`}
                    className="resize-none w-full"
                    {...field}
                  />
                </FormControl>

                <FormDescription className="text-right flex gap-2 items-center justify-end">
                  {field.value?.length}/{BIO_MAX_LENGTH} characters
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
                    Save Bio
                  </Button>
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </form>
    </Form>
  );
}
