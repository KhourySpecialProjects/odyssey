"use client";

import { COLLEGES } from "@/lib/globals";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createAccessRequest } from "@/lib/actions";
import {
  AFFILIATIONS,
  accessRequestSchema as formSchema,
} from "@/lib/validations/access-request";
import { ArrowRightIcon, LoaderIcon } from "lucide-react";
import { toast } from "sonner";

export function RequestAccessForm() {
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
          toast.error("Uh oh! Something went wrong.", {
            description: r.error || "",
          });
        } else {
          toast.success("Your access request has been successfully submitted.");
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
              <FormLabel className="dark:text-red-500">Given/First Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="Sam"
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
              <FormLabel className="dark:text-red-500">Family/Last Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="Serif"
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
                <FormLabel className="dark:text-red-500">Email</FormLabel>
                <FormControl>
                  <Input
                    placeholder="serif.s@northeastern.edu"
                    type="email"
                    autoComplete="email"
                    {...field}
                  />
                </FormControl>
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
              <FormLabel className="dark:text-red-500">Affiliation</FormLabel>
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
              <FormLabel className="dark:text-red-500">College</FormLabel>
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
            className="w-full dark:bg-slate-300"
            disabled={isPending}
          >
            Submit Request
          </Button>
        </div>
      </form>
    </Form>
  );
}
