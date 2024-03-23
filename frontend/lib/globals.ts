type College = {
  value: string;
  label: string;
};
export const COLLEGES: College[] = [
  { value: "BV", label: "Bouvé College of Health Sciences" },
  { value: "CAMD", label: "College of Arts, Media and Design" },
  { value: "COE", label: "College of Engineering" },
  { value: "CPS", label: "College of Professional Studies" },
  { value: "COS", label: "College of Science" },
  { value: "CSSH", label: "College of Social Sciences and Humanities" },
  { value: "DMSB", label: "D’Amore-McKim School of Business" },
  { value: "KCCS", label: "Khoury College of Computer Sciences" },
  { value: "MI", label: "Mills College at Northeastern" },
  { value: "LAW", label: "School of Law" },
  { value: "other", label: "Other" },
];

export const PERMITTED_EMAIL_DOMAINS = ["northeastern.edu", "neu.edu"];

export type SortFilterItem = {
  label: string;
  slug: string | null;
  sortKey: "name:asc" | "name:desc" | "createdAt:asc" | "createdAt:desc";
};

export const defaultSort: SortFilterItem = {
  label: "Alphabetical: A to Z",
  slug: "alphabetical-asc",
  sortKey: "name:asc",
};

export const sorting: SortFilterItem[] = [
  defaultSort,
  {
    label: "Alphabetical: Z to A",
    slug: "alphabetical-desc",
    sortKey: "name:desc",
  },
  {
    label: "Latest",
    slug: "latest-desc",
    sortKey: "createdAt:desc",
  },
  {
    label: "Oldest",
    slug: "latest-asc",
    sortKey: "createdAt:asc",
  },
];
