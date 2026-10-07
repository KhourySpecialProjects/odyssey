import {
  decideMaintenance,
  isMaintenanceMode,
  renderMaintenancePage,
  type MaintenanceRequest,
} from "@/lib/maintenance";

const ON = { MAINTENANCE_MODE: "true" };
const ON_WITH_BYPASS = { ...ON, MAINTENANCE_BYPASS_TOKEN: "s3cret-token" };

function request(overrides: Partial<MaintenanceRequest> = {}) {
  return {
    pathname: "/explore",
    method: "GET",
    userAgent: "Mozilla/5.0",
    bypassParam: null,
    bypassCookie: undefined,
    ...overrides,
  };
}

describe("isMaintenanceMode", () => {
  it.each([
    [{}, false],
    [{ MAINTENANCE_MODE: "false" }, false],
    [{ MAINTENANCE_MODE: "1" }, false],
    [{ MAINTENANCE_MODE: "true" }, true],
  ])("%j -> %s", (env, expected) => {
    expect(isMaintenanceMode(env)).toBe(expected);
  });
});

describe("decideMaintenance", () => {
  it("allows everything when maintenance mode is off", () => {
    expect(decideMaintenance(request(), {})).toEqual({ kind: "allow" });
    expect(
      decideMaintenance(
        request({ pathname: "/api/run-code", method: "POST" }),
        {},
      ),
    ).toEqual({ kind: "allow" });
  });

  it.each([
    ["/", "GET"],
    ["/explore", "GET"],
    ["/d/pandas-fundamentals/selecting-data", "GET"],
    ["/admin/users", "HEAD"],
  ])("shows the page for %s (%s)", (pathname, method) => {
    expect(decideMaintenance(request({ pathname, method }), ON)).toEqual({
      kind: "page",
    });
  });

  it.each(["/api/run-code", "/api/auth/session", "/api"])(
    "answers %s with the API 503",
    (pathname) => {
      expect(decideMaintenance(request({ pathname }), ON)).toEqual({
        kind: "api",
      });
    },
  );

  it.each(["POST", "PUT", "DELETE"])(
    "blocks %s requests to pages, which covers Server Actions",
    (method) => {
      expect(
        decideMaintenance(request({ pathname: "/d/some-droplet", method }), ON),
      ).toEqual({ kind: "write" });
    },
  );

  it("lets the ALB health check through so the tasks stay healthy", () => {
    expect(
      decideMaintenance(
        request({ pathname: "/", userAgent: "ELB-HealthChecker/2.0" }),
        ON,
      ),
    ).toEqual({ kind: "allow" });
  });

  describe("bypass", () => {
    it("grants the bypass for the right token in the URL", () => {
      expect(
        decideMaintenance(
          request({ bypassParam: "s3cret-token" }),
          ON_WITH_BYPASS,
        ),
      ).toEqual({ kind: "grant-bypass" });
    });

    it("lets a browser with the bypass cookie use the site", () => {
      expect(
        decideMaintenance(
          request({
            pathname: "/api/run-code",
            method: "POST",
            bypassCookie: "s3cret-token",
          }),
          ON_WITH_BYPASS,
        ),
      ).toEqual({ kind: "allow" });
    });

    it.each([
      ["a wrong token in the URL", { bypassParam: "guess" }],
      ["a wrong cookie", { bypassCookie: "guess" }],
      ["an empty token in the URL", { bypassParam: "" }],
    ])("shows the page for %s", (_label, overrides) => {
      expect(decideMaintenance(request(overrides), ON_WITH_BYPASS)).toEqual({
        kind: "page",
      });
    });

    it("never bypasses when no token is configured", () => {
      expect(
        decideMaintenance(request({ bypassParam: "", bypassCookie: "" }), ON),
      ).toEqual({ kind: "page" });
    });
  });
});

describe("renderMaintenancePage", () => {
  it("is a complete page that tells students what's happening", () => {
    const html = renderMaintenancePage();
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain("<title>Odyssey is under maintenance</title>");
    expect(html).toContain("Odyssey is getting an update");
    expect(html).toContain("Scheduled maintenance");
    expect(html).toContain('http-equiv="refresh" content="60"');
    expect(html).not.toMatch(/<script/i);
  });
});
