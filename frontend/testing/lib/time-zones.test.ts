import {
  DEFAULT_TIME_ZONE,
  isTimeZone,
  TIME_ZONES,
  userTimeZone,
} from "@/lib/time-zones";

describe("time zones", () => {
  it("lists only zones Intl can format, with no padding", () => {
    for (const zone of TIME_ZONES) {
      expect(zone).toBe(zone.trim());
      expect(() =>
        new Intl.DateTimeFormat("en-US", { timeZone: zone }).format(),
      ).not.toThrow();
    }
  });

  it("recognises listed zones only", () => {
    expect(isTimeZone("America/Los_Angeles")).toBe(true);
    expect(isTimeZone("America/Los_Angeles  ")).toBe(false);
    expect(isTimeZone("EST")).toBe(false);
    expect(isTimeZone(undefined)).toBe(false);
    expect(isTimeZone(42)).toBe(false);
  });

  it("returns the user's zone, or New York when it is missing or unknown", () => {
    expect(DEFAULT_TIME_ZONE).toBe("America/New_York");
    expect(userTimeZone("Asia/Tokyo")).toBe("Asia/Tokyo");
    expect(userTimeZone(null)).toBe(DEFAULT_TIME_ZONE);
    expect(userTimeZone(undefined)).toBe(DEFAULT_TIME_ZONE);
    expect(userTimeZone("Mars/Olympus_Mons")).toBe(DEFAULT_TIME_ZONE);
  });
});
