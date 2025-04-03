export enum AuthorizedUserRoleTitle {
  SysAdmin = "System Admin",
  AcadAdmin = "Academic Admin",
  ContentCreator = "Content Creator",
  User = "User",
  ContentEditor = "Content Editor",
  Faculty = "Faculty",
  WebsiteEditor = "Website Editor",
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

export const AuthorizedUserAdminRoles = [
  AuthorizedUserRoleTitle.SysAdmin,
  AuthorizedUserRoleTitle.AcadAdmin,
];

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
  sortKey:
    | "name:asc"
    | "name:desc"
    | "createdAt:asc"
    | "createdAt:desc"
    | "completion:asc"
    | "completion:desc"
    | "rating:asc"
    | "rating:desc";
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
];

export const playlistSorting: SortFilterItem[] = [
  { label: "A-Z", slug: "name:asc", sortKey: "name:asc" },
  { label: "Z-A", slug: "name:desc", sortKey: "name:desc" },
];

export const defaultSort: SortFilterItem = sorting[0];
