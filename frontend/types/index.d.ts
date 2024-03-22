export type User = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  nuid?: string;
  jobTitle?: string;
  isAdmin: boolean;
};

export type NavItem = {
  href: string;
  label: string;
};

export type GeneralConfig = {
  mainNav: NavItem[];
};
