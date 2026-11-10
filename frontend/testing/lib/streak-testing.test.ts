/** @jest-environment node */
import { cookies } from "next/headers";
import {
  setStreakTestMode,
  streakTestingEnabled,
  streakTestMode,
} from "@/lib/streak-testing";

jest.mock("next/headers", () => ({ cookies: jest.fn() }));

const jar = { get: jest.fn(), set: jest.fn(), delete: jest.fn() };
const ENV = process.env.NEXT_PUBLIC_APP_ENV;

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(cookies).mockResolvedValue(jar as never);
  process.env.NEXT_PUBLIC_APP_ENV = "local";
});

afterAll(() => {
  process.env.NEXT_PUBLIC_APP_ENV = ENV;
});

it.each([
  ["local", true],
  ["development", true],
  ["production", false],
  [undefined, false],
])("NEXT_PUBLIC_APP_ENV %p turns testing on: %s", (env, on) => {
  if (env === undefined) delete process.env.NEXT_PUBLIC_APP_ENV;
  else process.env.NEXT_PUBLIC_APP_ENV = env;

  expect(streakTestingEnabled()).toBe(on);
});

describe("streakTestMode", () => {
  it.each([
    [undefined, { test: false, offsetDays: 0 }],
    ['{"offsetDays":3}', { test: true, offsetDays: 3 }],
    ['{"offsetDays":9999}', { test: true, offsetDays: 0 }],
    ["not json", { test: false, offsetDays: 0 }],
  ])("reads the cookie %p as %p", async (value, mode) => {
    jar.get.mockReturnValue(value === undefined ? undefined : { value });

    expect(await streakTestMode()).toEqual(mode);
  });

  it("ignores the cookie on production", async () => {
    process.env.NEXT_PUBLIC_APP_ENV = "production";
    jar.get.mockReturnValue({ value: '{"offsetDays":3}' });

    expect(await streakTestMode()).toEqual({ test: false, offsetDays: 0 });
    expect(cookies).not.toHaveBeenCalled();
  });

  it("is the real streak outside a request", async () => {
    jest.mocked(cookies).mockRejectedValue(new Error("outside a request"));

    expect(await streakTestMode()).toEqual({ test: false, offsetDays: 0 });
  });
});

it("setStreakTestMode sets an httpOnly cookie, or deletes it", async () => {
  await setStreakTestMode({ test: true, offsetDays: 2 });
  await setStreakTestMode(null);

  expect(jar.set).toHaveBeenCalledWith(
    "streak-testing",
    '{"offsetDays":2}',
    expect.objectContaining({ httpOnly: true, path: "/" }),
  );
  expect(jar.delete).toHaveBeenCalledWith("streak-testing");
});
