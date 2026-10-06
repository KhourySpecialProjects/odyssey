import {
  authorizeDemoLogin,
  getDemoAccounts,
  isDemoEmail,
} from "@/lib/auth/demo-login";
import { profileEmailFromUsername } from "@/lib/profile-email";
import { fetchAPI } from "@/lib/utils";

jest.mock("@/lib/utils", () => ({ fetchAPI: jest.fn() }));

const mockFetchAPI = fetchAPI as jest.MockedFunction<typeof fetchAPI>;
const originalEnv = process.env;

beforeEach(() => {
  jest.clearAllMocks();
  process.env = { ...originalEnv, DEMO_MODE: "true" };
});

afterAll(() => {
  process.env = originalEnv;
});

describe("isDemoEmail", () => {
  it.each(["student1@demo.odyssey.test", "contentcreator2@demo.odyssey.test"])(
    "accepts %s",
    (email) => expect(isDemoEmail(email)).toBe(true),
  );

  it.each([
    "student1@northeastern.edu",
    "student1@demo.odyssey.test.evil.com",
    "student1@evil.demo.odyssey.test",
    "@demo.odyssey.test",
    "",
    undefined,
  ])("rejects %s", (email) => expect(isDemoEmail(email)).toBe(false));
});

describe("authorizeDemoLogin", () => {
  const student1 = {
    id: 6,
    email: "student1@demo.odyssey.test",
    firstName: "Student",
    lastName: "1",
    isEnabled: true,
  };

  it("logs in an enabled demo account", async () => {
    mockFetchAPI.mockResolvedValueOnce([student1]);

    const user = await authorizeDemoLogin({
      email: "Student1@demo.odyssey.test ",
    });

    expect(user).toEqual({
      id: "6",
      email: "student1@demo.odyssey.test",
      name: "Student 1",
    });
    expect(mockFetchAPI).toHaveBeenCalledWith(
      "/authorized-users",
      expect.objectContaining({
        urlParams: expect.objectContaining({
          filters: { email: { $eq: "student1@demo.odyssey.test" } },
        }),
      }),
    );
  });

  it("refuses everything when demo mode is off", async () => {
    process.env.DEMO_MODE = "false";

    expect(await authorizeDemoLogin({ email: student1.email })).toBeNull();
    expect(mockFetchAPI).not.toHaveBeenCalled();
  });

  it("refuses real accounts without looking them up", async () => {
    expect(
      await authorizeDemoLogin({ email: "someone@northeastern.edu" }),
    ).toBeNull();
    expect(mockFetchAPI).not.toHaveBeenCalled();
  });

  it("refuses demo emails that don't exist", async () => {
    mockFetchAPI.mockResolvedValueOnce([]);

    expect(
      await authorizeDemoLogin({ email: "nobody@demo.odyssey.test" }),
    ).toBeNull();
  });

  it("refuses disabled demo accounts", async () => {
    mockFetchAPI.mockResolvedValueOnce([{ ...student1, isEnabled: false }]);

    expect(await authorizeDemoLogin({ email: student1.email })).toBeNull();
  });
});

describe("getDemoAccounts", () => {
  it("lists personas by role, then the background students in number order", async () => {
    mockFetchAPI.mockResolvedValueOnce([
      {
        email: "student10@demo.odyssey.test",
        firstName: "Student",
        lastName: "10",
        bio: null,
        roles: [{ title: "User" }],
      },
      {
        email: "student1@demo.odyssey.test",
        firstName: "Student",
        lastName: "1",
        bio: "Keeps up.",
        roles: [{ title: "User" }],
      },
      {
        email: "faculty1@demo.odyssey.test",
        firstName: "Faculty",
        lastName: "1",
        bio: "Teaches.",
        roles: [{ title: "User" }, { title: "Faculty" }],
      },
      {
        email: "student4@demo.odyssey.test",
        firstName: "Student",
        lastName: "4",
        bio: null,
        roles: [{ title: "User" }],
      },
      {
        email: "admin1@demo.odyssey.test",
        firstName: "Admin",
        lastName: "1",
        bio: "Runs it.",
        roles: [{ title: "User" }, { title: "System Admin" }],
      },
    ] as never);

    const { personas, others } = await getDemoAccounts();

    expect(personas.map((p) => [p.email, p.role])).toEqual([
      ["admin1@demo.odyssey.test", "System Admin"],
      ["faculty1@demo.odyssey.test", "Faculty"],
      ["student1@demo.odyssey.test", "Student"],
    ]);
    expect(others.map((p) => p.name)).toEqual(["Student 4", "Student 10"]);
  });
});

describe("profileEmailFromUsername", () => {
  it("uses the demo domain in demo mode", () => {
    expect(profileEmailFromUsername("student1")).toBe(
      "student1@demo.odyssey.test",
    );
  });

  it("uses the Northeastern domain outside demo mode", () => {
    process.env.DEMO_MODE = "false";

    expect(profileEmailFromUsername("smith.j")).toBe(
      "smith.j@northeastern.edu",
    );
  });

  it("keeps a full email from links that didn't strip the domain", () => {
    expect(profileEmailFromUsername("student2%40demo.odyssey.test")).toBe(
      "student2@demo.odyssey.test",
    );
  });
});
