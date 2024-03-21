import { COLLEGES } from "@/app/globals";
import { z } from "zod";

export const PERMITTED_DOMAINS = ["northeastern.edu", "neu.edu"];

export const AFFILIATIONS = [
  { value: "student", label: "Student" },
  { value: "faculty", label: "Faculty" },
  { value: "staff", label: "Staff" },
  { value: "other", label: "Other" },
];
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

export const createAccessRequestSchema = z
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
