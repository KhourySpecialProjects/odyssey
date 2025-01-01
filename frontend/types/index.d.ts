import { AuthorizedUser } from "@/components/admin/users/authorized-users";
import { type StrapiMediaParams } from "./strapi";
import { AuthorizedUserRoleTitle } from "@/lib/globals";

export type FocusArea = "personal" | "professional" | "technical";

export type DropletType = "knowledge" | "skill";

export type DropletStatus = "draft" | "edit" | "published";

export type AuthorizedUserRole = {
  id: number;
  title: AuthorizedUserRoleTitle;
  authorizedUsers?: AuthorizedUser[];
};

export type User = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  nuid?: string;
  roles: AuthorizedUserRoleTitle[];
};

export type AuthorizedUser = {
  id: number;
  email: string;
  roles: AuthorizedUserRole[];
  isEnabled: boolean;
  enrollments?: Enrollment[];
  playlists?: Playlist[];
};

export type NavItem = {
  href: string;
  label: string;
  isHidden?: boolean;
};

export type GeneralConfig = {
  mainNav: NavItem[];
  contentCreatorNav: NavItem[];
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

interface DropletLesson {
  id: number;
  orderIndex: number;
  lesson: Lesson;
}

// TODO: fully migrate from lessons to droplet_lessons. 
export type Droplet = {
  id: number;
  slug: string;
  name: string;
  description?: string;
  overview?: string;
  type: DropletType;
  focusArea: FocusArea;
  tags?: Tag[];
  learningObjectives: LearningObjective[];
  lessons?: Lesson[];
  authors?: Author[];
  nextSteps?: Resource[];
  prerequisites?: Droplet[];
  postrequisites?: Droplet[];
  isHidden: boolean;
  status: DropletStatus;
  droplet_lessons: DropletLesson[];
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

export interface Playlist {
  id: number;
  name: string;
  slug: string;
  isPublic: boolean;
  description?: string;
  duration: "short" | "medium" | "long";
  droplets?: Droplet[];
  authorized_users?: {
    id: number;
    email: string;
  }[];
  author?: {
    id: number;
    name: string;
  };
}

export type PlaylistListResponse = {
  data: Playlist[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
};
