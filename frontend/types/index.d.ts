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
  name: string;
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

export type LearningObjective = {
  id: number;
  objective: string;
};

export type Droplet = {
  id: number;
  slug: string;
  name: string;
  description?: string;
  type: "knowledge" | "skill";
  focusArea: "personal" | "professional" | "technical";
  tags?: Tag[];
  learningObjectives: LearningObjective[];
  lessons?: Lesson[];
  authors: Author[];
  isHidden: boolean;
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
