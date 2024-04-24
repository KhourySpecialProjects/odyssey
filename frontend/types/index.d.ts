import { AuthorizedUser } from "@/components/admin/users/authorized-users";
import { type StrapiMediaParams } from "./strapi";

export type User = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  nuid?: string;
  jobTitle?: string;
  isAdmin: boolean;
};

export type AuthorizedUser = {
  id: number;
  email: string;
  isAdmin: boolean;
  isEnabled: boolean;
  enrollments?: Enrollment[];
};

export type NavItem = {
  href: string;
  label: string;
  isHidden?: boolean;
};

export type GeneralConfig = {
  mainNav: NavItem[];
};

export type Author = {
  id: number;
  name: string;
  bio?: string;
  photo?: StrapiMediaParams;
  droplets?: Droplet[];
};

export type Lesson = {
  id: number;
  name: string;
  slug: string;
  type?: "general" | "setup" | "activity" | "caseStudy";
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

export type Resource = {
  id: number;
  label?: string;
  url: string;
};

export type Droplet = {
  id: number;
  slug: string;
  name: string;
  description?: string;
  overview?: string;
  type: "knowledge" | "skill";
  focusArea: "personal" | "professional" | "technical";
  tags?: Tag[];
  learningObjectives: LearningObjective[];
  lessons?: Lesson[];
  authors?: Author[];
  nextSteps?: Resource[];
  prerequisites?: Droplet[];
  postrequisites?: Droplet[];
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

export type Enrollment = {
  id: string;
  authorizedUser: AuthorizedUser;
  droplet: Droplet;
  viewedLessons: Lesson[];
  isComplete: boolean;
};
