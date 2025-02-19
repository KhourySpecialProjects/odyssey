import { AuthorizedUser } from "@/components/admin/users/authorized-users";
import { type StrapiMediaParams } from "./strapi";
import { AuthorizedUserRoleTitle } from "@/lib/globals";

export type FocusArea = "personal" | "professional" | "technical";

export type DropletType = "knowledge" | "skill";

export type DropletStatus = "draft" | "edit" | "published";

export type AnnouncementType =
  | "playlist"
  | "droplet"
  | "friend"
  | "system"
  | "group"
  | "kudos";

export type AuthorizedUserRole = {
  id: number;
  title: AuthorizedUserRoleTitle;
  authorizedUsers?: AuthorizedUser[];
};

export interface Highlight {
  id?: number;
  authorized_user?: AuthorizedUser;
  text: string;
  position: {
    start: number;
    end: number;
  };
  color: string;
  yLevel?: number;
}

export type User = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  nuid?: string;
  roles: AuthorizedUserRoleTitle[];
  isActive: boolean;
};

export type AuthorizedUser = {
  id: number;
  email: string;
  roles: AuthorizedUserRole[];
  isEnabled: boolean;
  enrollments?: Enrollment[];
  playlists?: Playlist[];
  linkedin: string;
  github: string;
  firstTime: boolean;
  author?: Author;
  firstName: string;
  lastName: string;
  bio: string;
  friendships: Friendship[];
  sent_requests: AuthorizedUser[];
  received_requests: AuthorizedUser[];
  profilePhoto: string;
  blocked: AuthorizedUser[];
  was_blocked: AuthorizedUser[];
};

export type Media = {
  url: string;
  formats?: {
    thumbnail?: {
      url: string;
    };
  };
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
  authorizedUser?: AuthorizedUser;
};

export type Lesson = {
  id: number;
  name: string;
  slug: string;
  type?: "general" | "setup" | "activity" | "caseStudy";
  blocks: any[];
  droplets: Droplet[];
  notes: Note[];
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
  shouldBeLocked: boolean;
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

export type OpenEndedQuizQuestion = {
  id: number;
  content: string;
  correctAnswer: string;
};

export type Quiz = {
  id: number;
  questions: QuizQuestion[];
};

export type OpenEndedQuiz = {
  id: number;
  questions: OpenEndedQuizQuestion[];
};

export type Enrollment = {
  id: string;
  authorizedUser: AuthorizedUser;
  droplet: Droplet;
  viewedLessons: Lesson[];
  isComplete: boolean;
  rating: number;
  isFirstTime: boolean;
  isArchived: boolean;
  notes: Note[];
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
    authorizedUser: AuthorizedUser;
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

export type GroupSemester =
  | "Open Membership"
  | "Spring 2025"
  | "Summer 1 2025"
  | "Summer 2 2025"
  | "Summer 2025"
  | "Fall 2025"
  | "Spring 2026"
  | "Summer 1 2026"
  | "Summer 2 2026"
  | "Summer 2026"
  | "Fall 2026"
  | "Spring 2027"
  | "Summer 1 2027"
  | "Summer 2 2027"
  | "Summer 2027"
  | "Fall 2027";

export type Group = {
  id: number;
  groupName: string;
  slug: string;
  description?: string;
  semester: GroupSemester;
  isArchived: boolean;
  creator?: AuthorizedUser;
  admins?: AuthorizedUser[];
  managers?: AuthorizedUser[];
  members?: AuthorizedUser[];
  droplets?: Droplet[];
  playlists?: Playlist[];
};

export type GroupListResponse = {
  data: Group[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
};

export type ActionResponse<T = any> = {
  ok: boolean;
  data?: T | null;
  error?: any;
  message?: string;
};

export type Friendship = {
  authorized_users: AuthorizedUser[];
};

export type Announcement = {
  id: number;
  type: AnnouncementType;
  firstCreated: Date;
  content: string;
  droplet?: Droplet;
  group?: Group;
  authorized_user?: AuthorizedUser;
  playlist?: Playlist;
  kudosGiven?: boolean;
};

export type Note = {
  id: number;
  content: string;
  lesson: Lesson;
  enrollment: Enrollment;
  positionY: number;
  highlight?: Highlight;
};
