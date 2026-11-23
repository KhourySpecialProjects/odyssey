import { COLLEGES } from "@/lib/globals";
import { z } from "zod";

export const AFFILIATIONS = [
  { value: "undergraduateStudent", label: "Undergraduate Student" },
  { value: "graduateStudent", label: "Graduate Student" },
  { value: "faculty", label: "Faculty" },
  { value: "staff", label: "Staff" },
  { value: "other", label: "Other" },
];
type AffiliationValues = (typeof AFFILIATIONS)[number]["value"];
const AFFILIATION_VALUES: [AffiliationValues, ...AffiliationValues[]] = [
  AFFILIATIONS[0].value,
  ...AFFILIATIONS.slice(1).map((p) => p.value),
];

type CollegeValues = (typeof COLLEGES)[number]["value"];
const COLLEGE_VALUES: [CollegeValues, ...CollegeValues[]] = [
  COLLEGES[0].value,
  ...COLLEGES.slice(1).map((p) => p.value),
];

const nameField = z
  .string()
  .min(2, { error: "Enter at least 2 characters" })
  .max(50, { error: "Use 50 characters or fewer" });

export const accessRequestSchema = z.object({
  givenName: nameField,
  familyName: nameField,
  email: z.string().email({ error: "Enter a valid email address" }),
  affiliation: z.enum(AFFILIATION_VALUES, { error: "Select your affiliation" }),
  college: z.enum(COLLEGE_VALUES, { error: "Select your college" }),
});
