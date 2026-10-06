/**
 * The demo login replaces the real providers only in demo mode. authOptions
 * reads DEMO_MODE when the module loads, so each case loads it fresh.
 */
function providerIdsWith(demoMode: string | undefined): string[] {
  const originalEnv = process.env;
  process.env = { ...originalEnv, DEMO_MODE: demoMode };
  try {
    let ids: string[] = [];
    jest.isolateModules(() => {
      const { authOptions } = require("@/lib/auth/options");
      ids = authOptions.providers.map(
        (provider: { id: string; options?: { id?: string } }) =>
          provider.options?.id ?? provider.id,
      );
    });
    return ids;
  } finally {
    process.env = originalEnv;
  }
}

describe("login providers", () => {
  it("only offers the demo login in demo mode", () => {
    expect(providerIdsWith("true")).toEqual(["demo"]);
  });

  it("keeps Microsoft and GitHub login outside demo mode", () => {
    expect(providerIdsWith(undefined)).toEqual(["azure-ad", "github"]);
  });
});
