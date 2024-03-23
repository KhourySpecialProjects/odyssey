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

export type Author = {
  name: string;
  bio: string;
  photo: any;
  droplets: Droplet[];
};

export type Lesson = {
  title: string;
  slug: string;
  blocks: any[];
  droplets: Droplet[];
};

export type Tag = {
  id: string;
  slug: string;
  name: string;
  droplets: Droplet[];
};

export type Droplet = {
  id: string;
  name: string;
  type: string;
  slug: string;
  type: "knowledge" | "skill";
  focusArea: "personal" | "professional" | "technical";
  tags: Tag[];
  lessons: Lesson[];
  authors: Author[];
};
