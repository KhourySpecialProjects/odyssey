export enum AuthorizedUserRoleTitle {
  SysAdmin = "System Admin",
  ContentCreator = "Content Creator",
  User = "User",
  ContentEditor = "Content Editor",
  Faculty = "Faculty",
}

export enum AnnouncementTypeTitle {
  Droplet = "Droplet",
  Playlist = "Playlist",
  Group = "Group",
  System = "System",
  Friend = "Friend",
  Kudos = "Kudos",
}

export enum NoteTypeTitle {
  Pink = "#f9a8d4",
  Orange = "#fbd38d",
  Yellow = "#fff300",
  Green = "#86efac",
  Blue = "#93c5fd",
}

export const AuthorizedUserAdminRoles = [AuthorizedUserRoleTitle.SysAdmin];

type College = {
  value: string;
  label: string;
  shortLabel: string;
};
export const COLLEGES: College[] = [
  {
    value: "BV",
    label: "Bouvé College of Health Sciences",
    shortLabel: "Bouvé",
  },
  {
    value: "CAMD",
    label: "College of Arts, Media and Design",
    shortLabel: "CAMD",
  },
  { value: "COE", label: "College of Engineering", shortLabel: "COE" },
  { value: "CPS", label: "College of Professional Studies", shortLabel: "CPS" },
  { value: "COS", label: "College of Science", shortLabel: "COS" },
  {
    value: "CSSH",
    label: "College of Social Sciences and Humanities",
    shortLabel: "CSSH",
  },
  {
    value: "DMSB",
    label: "D’Amore-McKim School of Business",
    shortLabel: "D’Amore-McKim",
  },
  {
    value: "KCCS",
    label: "Khoury College of Computer Sciences",
    shortLabel: "Khoury",
  },
  { value: "MI", label: "Mills College at Northeastern", shortLabel: "Mills" },
  { value: "LAW", label: "School of Law", shortLabel: "Law" },
  { value: "other", label: "Other", shortLabel: "Other" },
];

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
  {
    name: "difficulty",
    label: "Difficulty",
    options: [
      { label: "Beginner", value: "beginner" },
      { label: "Intermediate", value: "intermediate" },
      { label: "Advanced", value: "advanced" },
    ],
  },
];

export type SortFilterItem = {
  label: string;
  slug: string;
  sortKey:
    | "name:asc"
    | "name:desc"
    | "createdAt:asc"
    | "createdAt:desc"
    | "completion:asc"
    | "completion:desc"
    | "rating:asc"
    | "rating:desc"
    | "duedate:asc"
    | "duedate:desc";
};

export const sorting: SortFilterItem[] = [
  { label: "A-Z", slug: "name:asc", sortKey: "name:asc" },
  { label: "Z-A", slug: "name:desc", sortKey: "name:desc" },
  {
    label: "Most Complete",
    slug: "completion:desc",
    sortKey: "completion:desc",
  },
  {
    label: "Least Complete",
    slug: "completion:asc",
    sortKey: "completion:asc",
  },
  {
    label: "Best Rating",
    slug: "rating:desc",
    sortKey: "rating:desc",
  },
  {
    label: "Worst Rating",
    slug: "rating:asc",
    sortKey: "rating:asc",
  },
  {
    label: "Due Date (Soonest)",
    slug: "duedate:asc",
    sortKey: "duedate:asc",
  },
  {
    label: "Due Date (Latest)",
    slug: "duedate:desc",
    sortKey: "duedate:desc",
  },
];

export const playlistSorting: SortFilterItem[] = [
  { label: "A-Z", slug: "name:asc", sortKey: "name:asc" },
  { label: "Z-A", slug: "name:desc", sortKey: "name:desc" },
];

export const defaultSort: SortFilterItem = sorting[0];
