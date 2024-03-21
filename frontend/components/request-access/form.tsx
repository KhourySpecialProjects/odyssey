"use client";

import { COLLEGES, PERMITTED_EMAIL_DOMAINS } from "@/app/globals";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AFFILIATIONS, createAccessRequestSchema as formSchema } from "./types";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { createAccessRequest } from "@/lib/actions";
import { ArrowRightIcon, LoaderIcon } from "lucide-react";
import { useTransition } from "react";

export function RequestAccessForm() {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      givenName: "",
      familyName: "",
      email: "",
      affiliation: undefined,
      college: undefined,
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    startTransition(() => {
      createAccessRequest(values).then((r) => {
        if (r && !r.ok) {
          toast({
            variant: "destructive",
            title: "Uh oh! Something went wrong.",
            description: r.error || "",
          });
        } else {
          toast({
            title: "Success!",
            description: "Your access request has been successfully submitted.",
          });
        }
      });
    });
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2"
      >
        <FormField
          control={form.control}
          name="givenName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Given/First Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="John"
                  type="text"
                  autoComplete="given-name"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="familyName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Family/Last Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="Doe"
                  type="text"
                  autoComplete="family-name"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="md:col-span-2">
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
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  The following email domains are supported:{" "}
                  {PERMITTED_EMAIL_DOMAINS.join(", ")}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="affiliation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Affiliation</FormLabel>
              <Select onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your affiliation" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {AFFILIATIONS.map((c) => (
                    <SelectItem value={c.value} key={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="college"
          render={({ field }) => (
            <FormItem>
              <FormLabel>College</FormLabel>
              <Select onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your college/school" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {COLLEGES.map((c) => (
                    <SelectItem value={c.value} key={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="sm:col-span-2">
          <Button
            type="submit"
            after={isPending ? <LoaderIcon /> : <ArrowRightIcon />}
            className="w-full"
            disabled={isPending}
          >
            Submit Request
          </Button>
        </div>
      </form>
    </Form>
  );
}
