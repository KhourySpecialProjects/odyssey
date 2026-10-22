import { getLoginProviders } from "@/lib/auth/login-providers";
import { authOptions } from "@/lib/auth/options";

// authOptions pulls in request/azure modules; stub them as options.test does.
jest.mock("@/lib/utils", () => ({
  fetchAPI: jest.fn(),
}));

jest.mock("@/lib/auth/azure", () => ({
  getUserProfile: jest.fn(),
  getUserPhoto: jest.fn(),
}));

jest.mock("@/lib/requests/authorized-user", () => ({
  fetchIsAuthorizedUser: jest.fn(),
}));

// next-auth's own implementation of the /api/auth/providers response, used as
// the reference for parity. These internals aren't in the package's
// `exports`, hence the node_modules paths.
type Providers = typeof authOptions.providers;
type ParseProviders = (params: { providers: Providers; url: unknown }) => {
  providers: Providers;
};
type ProvidersRoute = (providers: Providers) => { body: unknown };
type ParseUrl = (url?: string) => unknown;

const NEXT_AUTH = "../../node_modules/next-auth";
const parseProviders = jest.requireActual<{ default: ParseProviders }>(
  `${NEXT_AUTH}/core/lib/providers`,
).default;
const providersRoute = jest.requireActual<{ default: ProvidersRoute }>(
  `${NEXT_AUTH}/core/routes/providers`,
).default;
const parseUrl = jest.requireActual<{ default: ParseUrl }>(
  `${NEXT_AUTH}/utils/parse-url`,
).default;

function nextAuthProvidersResponse(nextAuthUrl?: string) {
  const { providers } = parseProviders({
    providers: authOptions.providers,
    url: parseUrl(nextAuthUrl),
  });
  return providersRoute(providers).body;
}

describe("getLoginProviders", () => {
  const originalUrl = process.env.NEXTAUTH_URL;

  afterEach(() => {
    if (originalUrl === undefined) delete process.env.NEXTAUTH_URL;
    else process.env.NEXTAUTH_URL = originalUrl;
  });

  it("returns the client-safe provider map LoginButtons consumes", () => {
    process.env.NEXTAUTH_URL = "https://www.khouryodyssey.org";

    expect(getLoginProviders()).toEqual({
      "azure-ad": {
        id: "azure-ad",
        name: "Azure Active Directory",
        type: "oauth",
        signinUrl: "https://www.khouryodyssey.org/api/auth/signin/azure-ad",
        callbackUrl: "https://www.khouryodyssey.org/api/auth/callback/azure-ad",
      },
      github: {
        id: "github",
        name: "GitHub",
        type: "oauth",
        signinUrl: "https://www.khouryodyssey.org/api/auth/signin/github",
        callbackUrl: "https://www.khouryodyssey.org/api/auth/callback/github",
      },
    });
  });

  it("never exposes provider secrets or config", () => {
    for (const provider of Object.values(getLoginProviders())) {
      expect(Object.keys(provider).sort()).toEqual([
        "callbackUrl",
        "id",
        "name",
        "signinUrl",
        "type",
      ]);
    }
  });

  it.each([
    ["unset", undefined],
    ["an origin", "http://localhost:3000"],
    ["a custom auth path", "https://example.org/custom/auth/"],
    ["no protocol", "example.org"],
  ])(
    "matches next-auth's /api/auth/providers response when NEXTAUTH_URL is %s",
    (_label, nextAuthUrl) => {
      if (nextAuthUrl === undefined) delete process.env.NEXTAUTH_URL;
      else process.env.NEXTAUTH_URL = nextAuthUrl;

      expect(getLoginProviders()).toEqual(
        nextAuthProvidersResponse(nextAuthUrl),
      );
    },
  );
});
