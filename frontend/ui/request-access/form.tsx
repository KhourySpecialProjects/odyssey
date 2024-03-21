"use client";

import { COLLEGES } from "@/app/globals";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { ArrowRightIcon } from "lucide-react";

const AFFILIATIONS = [
  { value: "student", label: "Student" },
  { value: "faculty", label: "Faculty" },
  { value: "staff", label: "Staff" },
  { value: "other", label: "Other" },
];
const PERMITTED_DOMAINS = ["northeastern.edu", "neu.edu"];

type AffiliationValues = (typeof AFFILIATIONS)[number]["value"];
const AFFILIATION_VALUES: [AffiliationValues, ...AffiliationValues[]] = [
  AFFILIATIONS[0].value,
  // And then merge in the remaining values from `properties`
  ...AFFILIATIONS.slice(1).map((p) => p.value),
];

type CollegeValues = (typeof COLLEGES)[number]["value"];
const COLLEGE_VALUES: [CollegeValues, ...CollegeValues[]] = [
  COLLEGES[0].value,
  // And then merge in the remaining values from `properties`
  ...COLLEGES.slice(1).map((p) => p.value),
];

const formSchema = z
  .object({
    givenName: z.string().min(2).max(50),
    familyName: z.string().min(2).max(50),
    email: z.string().email(),
    affiliation: z.enum(AFFILIATION_VALUES),
    college: z.enum(COLLEGE_VALUES),
  })
  .refine(
    (data) => {
      const domain = data.email.split("@")[1];
      return PERMITTED_DOMAINS.includes(domain);
    },
    {
      message: `Email must be @${PERMITTED_DOMAINS.join(" or @")}`,
      path: ["email"],
    }
  );

export function RequestAccessForm() {
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
    // Do something with the form values.
    // ✅ This will be type-safe and validated.
    console.log(values);
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
                  {PERMITTED_DOMAINS.join(", ")}
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
          <Button type="submit" after={<ArrowRightIcon />} className="w-full">
            Submit Request
          </Button>
        </div>
      </form>
    </Form>
  );
}
