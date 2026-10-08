/**
 * Recap and present routes use the viewable-droplet gate; recap recommendations
 * only offer listed droplets.
 */
import DropletRecapRoute, {
  generateMetadata as recapMetadata,
} from "@/app/(droplets)/d/[slug]/recap/page";
import PresentationPage from "@/app/(presentation)/d/[slug]/present/page";
import { getCurrentUser } from "@/lib/auth/session";
import { getAuthorizedUserId } from "@/lib/auth/current-user-id";
import {
  getCachedEnrollmentsWithLessonIds,
  getCachedUser,
  getCachedViewableDropletBySlug,
} from "@/lib/requests/cached";
import { getDroplets } from "@/lib/requests/droplet";
import { getNotesByDroplet } from "@/lib/requests/notes";
import { getHighlightsByDroplet } from "@/lib/requests/highlights";

jest.mock("@/lib/auth/session", () => ({ getCurrentUser: jest.fn() }));
jest.mock("@/lib/auth/current-user-id", () => ({
  getAuthorizedUserId: jest.fn(),
}));
jest.mock("@/lib/requests/cached", () => ({
  getCachedViewableDropletBySlug: jest.fn(),
  getCachedEnrollmentsWithLessonIds: jest.fn(),
  getCachedLessonBySlug: jest.fn(),
  getCachedUser: jest.fn(),
}));
jest.mock("@/lib/requests/droplet", () => ({ getDroplets: jest.fn() }));
jest.mock("@/lib/requests/notes", () => ({ getNotesByDroplet: jest.fn() }));
jest.mock("@/lib/requests/highlights", () => ({
  getHighlightsByDroplet: jest.fn(),
}));
jest.mock("next/navigation", () => ({
  notFound: jest.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  redirect: jest.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));
jest.mock("@/components/droplets/droplet-tile", () => ({
  DropletTile: () => null,
}));
jest.mock("@/components/droplets/completed-droplet-block", () => ({
  CompletedDropletBlock: () => null,
}));
jest.mock("@/components/droplets/notes-container", () => ({
  NotesContainer: () => null,
}));
jest.mock("@/components/droplets/notes-pdf-button", () => ({
  NotesPdfButton: () => null,
}));
jest.mock("@/components/droplets/lessons/note-taking/note-summary", () => ({
  NoteSummary: jest.fn().mockResolvedValue(new Uint8Array()),
}));
jest.mock("@/components/droplets/completion-backfill", () => ({
  CompletionBackfill: () => null,
}));
jest.mock("@/components/ui/rating-stars", () => ({ StarRating: () => null }));
jest.mock("@/app/(droplets)/d/[slug]/recap/confetti", () => ({
  Confetti: () => null,
}));
jest.mock("@/components/presentation/presentation-shell", () => ({
  PresentationShell: () => null,
}));
jest.mock("@/components/presentation/no-presentation-warning", () => ({
  NoPresentationWarning: () => null,
}));

const mockedViewable = jest.mocked(getCachedViewableDropletBySlug);
const mockedUser = jest.mocked(getCurrentUser);
const mockedUserId = jest.mocked(getAuthorizedUserId);
const mockedGetDroplets = jest.mocked(getDroplets);

const SESSION = { id: 7, email: "u@example.com", roles: [] } as never;
const DROPLET = {
  id: 5,
  name: "Python Basics",
  slug: "python-basics",
  tags: [{ slug: "python" }],
  learningObjectives: [],
  lessons: [],
} as never;
const params = () => Promise.resolve({ slug: "python-basics" });

beforeEach(() => {
  jest.clearAllMocks();
  mockedUser.mockResolvedValue(SESSION);
  mockedUserId.mockResolvedValue(7);
  mockedGetDroplets.mockResolvedValue([]);
  jest.mocked(getCachedUser).mockResolvedValue({ id: 7 } as never);
  jest.mocked(getCachedEnrollmentsWithLessonIds).mockResolvedValue([]);
  jest.mocked(getHighlightsByDroplet).mockResolvedValue([]);
  jest.mocked(getNotesByDroplet).mockResolvedValue([]);
});

describe("recap route", () => {
  it("404s the page when the viewable gate returns null", async () => {
    mockedViewable.mockResolvedValue(null);
    await expect(DropletRecapRoute({ params: params() })).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
  });

  it("404s the metadata when the viewable gate returns null", async () => {
    mockedViewable.mockResolvedValue(null);
    await expect(recapMetadata({ params: params() })).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
  });

  it("only recommends listed droplets", async () => {
    mockedViewable.mockResolvedValue(DROPLET);
    await DropletRecapRoute({ params: params() });

    const { filters } = mockedGetDroplets.mock.calls[0][0] as {
      filters: { $and: unknown[] };
    };
    expect(filters.$and).toContainEqual(
      expect.objectContaining({
        isHidden: { $eq: false },
        status: { $eq: "published" },
      }),
    );
  });
});

describe("present route", () => {
  it("404s when the viewable gate returns null", async () => {
    mockedViewable.mockResolvedValue(null);
    await expect(PresentationPage({ params: params() })).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
    expect(mockedViewable).toHaveBeenCalledWith("python-basics");
  });
});
