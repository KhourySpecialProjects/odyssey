import { type StrapiMediaParams } from "./strapi";

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
  id: number;
  name: string;
  bio: string;
  photo: StrapiMediaParams;
  droplets: Droplet[];
};

export type Lesson = {
  id: number;
  title: string;
  slug: string;
  blocks: any[];
  droplets: Droplet[];
};

export type Tag = {
  id: number;
  slug: string;
  name: string;
  droplets: Droplet[];
};

export type Droplet = {
  id: number;
  slug: string;
  name: string;
  description?: string;
  type: "knowledge" | "skill";
  focusArea: "personal" | "professional" | "technical";
  tags?: Tag[];
  lessons?: Lesson[];
  authors: Author[];
};

export type QuizAnswerOption = {
  id: number;
  content: string;
  isCorrect: boolean;
};

export type QuizQuestion = {
  id: number;
  content: string;
  answerOptions: QuizAnswerOption[];
};

export type Quiz = {
  id: number;
  questions: QuizQuestion[];
};
