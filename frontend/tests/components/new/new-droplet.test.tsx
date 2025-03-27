import { CreateDroplet } from "@/components/new/new-droplet";
import { getCurrentUser } from "@/lib/auth/session";
import { getTags } from "@/lib/requests/tag";
import { isAuthorizedUserAdmin, isContentCreator } from "@/lib/utils";

jest.mock("@/lib/auth/session", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("@/lib/requests/tag", () => ({
  getTags: jest.fn(),
}));

jest.mock("@/lib/utils", () => ({
  isContentCreator: jest.fn(),
  isAuthorizedUserAdmin: jest.fn(),
}));

jest.mock("next/navigation", () => {
  return {
    notFound: () => {
      throw new Error("NEXT_NOT_FOUND");
    },
  };
});

describe("CreateDroplet", () => {
  beforeEach(() => {
    (getCurrentUser as jest.Mock).mockResolvedValue({
      roles: ["content_creator"],
    });
    (getTags as jest.Mock).mockResolvedValue([]);
  });

  it("shows not found for unauthorized users", async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue({
      roles: ["user"],
    });
    expect(CreateDroplet()).rejects.toThrow();
  });

  test("returns notFound when user is not authorized", async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue({ roles: ["user"] });
    (isContentCreator as jest.Mock).mockImplementation(() => false);
    (isAuthorizedUserAdmin as jest.Mock).mockImplementation(() => false);

    await expect(CreateDroplet()).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
