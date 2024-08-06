export enum AuthorizedUserRoleTitle {
  SysAdmin = "System Admin",
  AcadAdmin = "Academic Admin",
  ContentCreator = "Content Creator",
  User = "User",
  ContentEditor = "Content Editor",
  Faculty = "Faculty",
}

export const AuthorizedUserAdminRoles  = [AuthorizedUserRoleTitle.SysAdmin, AuthorizedUserRoleTitle.AcadAdmin]

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

export type FilterOption = {
  label: string;
  value: string;
  count?: number;
};
export const DROPLET_FILTERS = [
  {
    name: "focusArea",
    label: "Focus Area",
    options: [
      {
        label: "Personal",
        value: "personal",
      },
      {
        label: "Professional",
        value: "professional",
      },
      {
        label: "Technical",
        value: "technical",
      },
    ],
  },
  {
    name: "type",
    label: "Type",
    options: [
      {
        label: "Knowledge",
        value: "knowledge",
      },
      {
        label: "Skill",
        value: "skill",
      },
    ],
  },
];

export type SortFilterItem = {
  label: string;
  slug: string;
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
    slug: "latest",
    sortKey: "createdAt:desc",
  },
  {
    label: "Earliest",
    slug: "earliest",
    sortKey: "createdAt:asc",
  },
];
