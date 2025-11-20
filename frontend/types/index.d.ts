import { AuthorizedUser } from "@/components/admin/users/authorized-users";
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

export type HighlightColor =
  | "#f9a8d4"
  | "#fbd38d"
  | "#fff300"
  | "#86efac"
  | "#93c5fd";

export type AuthorizedUserRole = {
  id: number;
  title: AuthorizedUserRoleTitle;
  authorizedUsers?: AuthorizedUser[];
};

export type Highlight = {
  id?: number;
  authorized_user?: AuthorizedUser;
  text: string;
  position: {
    start: number;
    end: number;
  };
  color: HighlightColor;
  lesson?: Lesson;
  yLevel?: number;
  blockId: number;
};

export type User = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  nuid?: string;
  roles: AuthorizedUserRoleTitle[];
  isActive: boolean;
};

export type AuthorizedUser = {
  groups: any;
  id: number;
  email: string;
  roles: AuthorizedUserRole[];
  isEnabled: boolean;
  isPublic: boolean;
  enrollments?: Enrollment[];
  playlists?: Playlist[];
  linkedin: string;
  github: string;
  website: string;
  firstTime: boolean;
  firstName: string;
  lastName: string;
  bio: string;
  friendships: Friendship[];
  sent_requests: AuthorizedUser[];
  received_requests: AuthorizedUser[];
  profilePhoto: string;
  blocked: AuthorizedUser[];
  was_blocked: AuthorizedUser[];
  timeZone: TimeZone;
  groups?: Group[];
  droplets?: Droplet[];
  created_playlists?: Playlist[];
  dropletsFavorited?: Droplet[];
  playlists_archived?: Playlist[];
};

export type Media = {
  url: string;
  formats?: {
    thumbnail?: {
      url: string;
    };
  };
};

export type GalleryItem = {
  title?: string;
  description?: string;
  image_urls?: string[];
};

export type Gallery = {
  id: number;
  title?: string;
  slug: string;
  items: GalleryItem[];
  subtitle: string;
};

export type NavItem = {
  href: string;
  label: string;
  isHidden?: boolean;
};

export type GeneralConfig = {
  mainNav: NavItem[];
};

export type Block =
  | { __component: "droplets.generic"; content: string }
  | { __component: "droplets.expandable"; title: string; content: string }
  | {
      __component: "droplets.callout";
      content: { type: string; children: { type: string; text: string }[] }[];
      color: string;
      type: string;
    }
  | { __component: "droplets.video"; url: string }
  | {
      __component: "droplets.quiz";
      questions: {
        id: number;
        content: string;
        answerOptions: { id: number; content: string; isCorrect: boolean }[];
      }[];
    }
  | {
      __component: "droplets.open-ended-quiz";
      questions: { id: number; content: string; correctAnswer: string }[];
    }
  | QuizBlock
  | OpenEndedQuizBlock;

export type Lesson = {
  id: number;
  name: string;
  slug: string;
  type?: "general" | "setup" | "activity" | "caseStudy";
  blocks: any[];
  blocksVersion?: "v1" | "v2";
  blocksV2?: any;
  droplets: Droplet[];
  notes: Note[];
  orderIndex: number;
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
  type: DropletType;
  focusArea: FocusArea;
  tags?: Tag[];
  learningObjectives: LearningObjective[];
  lessons?: Lesson[];
  nextSteps?: Resource[];
  prerequisites?: Droplet[];
  postrequisites?: Droplet[];
  isHidden: boolean;
  status: DropletStatus;
  originalDropletId?: number;
  authorized_users?: AuthorizedUser[];
  isArchived?: boolean;
  inReview?: boolean;
  afterReview?: string;
  funFact?: string;
  averageRating?: number;
  usersFavorited?: AuthorizedUser[];
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
  completionDate: Date;
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
  authors?: AuthorizedUser[];
  users_archived?: AuthorizedUser[];
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
  users_archived?: AuthorizedUser[];
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
  kudosGiven?: AuthorizedUser[];
};

export type Note = {
  id: number;
  content: string;
  lesson: Lesson;
  enrollment: Enrollment;
  positionY: number;
  highlight?: Highlight;
};

export type TimeZone =
  | "America/New_York"
  | "America/Chicago"
  | "America/Denver"
  | "America/Phoenix"
  | "America/Los_Angeles"
  | "America/Anchorage"
  | "America/Honolulu"
  | "America/Bogota"
  | "America/Lima"
  | "America/Caracas"
  | "America/Santiago"
  | "America/Argentina/Buenos_Aires"
  | "America/Sao_Paulo"
  | "Europe/London"
  | "Europe/Berlin"
  | "Europe/Paris"
  | "Europe/Madrid"
  | "Europe/Rome"
  | "Europe/Athens"
  | "Europe/Istanbul"
  | "Europe/Moscow"
  | "Asia/Dubai"
  | "Asia/Kolkata"
  | "Asia/Shanghai"
  | "Asia/Tokyo"
  | "Asia/Seoul"
  | "Asia/Bangkok"
  | "Asia/Singapore"
  | "Asia/Jakarta"
  | "Asia/Hong_Kong"
  | "Australia/Sydney"
  | "Australia/Melbourne"
  | "Australia/Brisbane"
  | "Pacific/Auckland"
  | "Pacific/Fiji"
  | "Africa/Cairo"
  | "Africa/Johannesburg"
  | "Africa/Lagos"
  | "Africa/Nairobi";

export type DueDate = {
  dueDate: DateTime;
  authorized_user: AuthorizedUser;
  droplet?: Droplet;
  playlist?: Playlist;
  group: Group;
};
