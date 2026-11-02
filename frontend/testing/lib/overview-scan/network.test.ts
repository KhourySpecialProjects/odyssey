/** @jest-environment node */
import { EventEmitter } from "node:events";
import http from "node:http";
import type { LookupAddress } from "node:dns";
import type { LookupFunction } from "node:net";

import {
  checkUrls,
  createSafeFetcher,
  isPublicAddress,
  type HopResponse,
  type Send,
} from "@/lib/overview-scan/network";

const ok = (over: Partial<HopResponse> = {}): HopResponse => ({
  status: 200,
  contentType: null,
  bytes: null,
  location: null,
  ...over,
});

const redirect = (location: string) => ok({ status: 302, location });

// A send that must never be reached
const noSend: Send = () => {
  throw new Error("send was called");
};

// Answers after `ms`, or rejects with the abort reason, like a real request
function delayed(res: HopResponse, ms: number): ReturnType<Send> {
  return new Promise((resolve) => setTimeout(() => resolve(res), ms));
}

const neverAnswers: Send = () => new Promise(() => {});

// A DNS resolver that answers every name with the given addresses
function fakeLookup(...addresses: LookupAddress[]) {
  return jest.fn(((_host, _options, callback) => {
    process.nextTick(() =>
      (callback as (e: null, a: LookupAddress[]) => void)(null, addresses),
    );
  }) as LookupFunction);
}

const v4 = (address: string): LookupAddress => ({ address, family: 4 });
const v6 = (address: string): LookupAddress => ({ address, family: 6 });

async function checkOne(url: string, options: Parameters<typeof checkUrls>[1]) {
  return (await checkUrls([url], options)).get(url);
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useRealTimers();
});

describe("isPublicAddress", () => {
  it.each([
    "0.0.0.0",
    "10.1.2.3",
    "100.64.0.1",
    "127.0.0.1",
    "127.255.255.254",
    "169.254.169.254",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.0.1",
    "198.18.0.1",
    "224.0.0.1",
    "255.255.255.255",
    "::",
    "::1",
    "fc00::1",
    "fd00:ec2::254",
    "fe80::1",
    "ff02::1",
    "::ffff:127.0.0.1",
    "::ffff:7f00:1",
    "::ffff:169.254.169.254",
    "64:ff9b::7f00:1",
    "2001:db8::1",
    "2002:7f00:1::1",
    "not-an-ip",
    "",
  ])("refuses %p", (ip) => {
    expect(isPublicAddress(ip)).toBe(false);
  });

  it.each([
    "8.8.8.8",
    "172.15.255.255",
    "172.32.0.1",
    "100.63.255.255",
    "100.128.0.1",
    "2606:4700:4700::1111",
    "::ffff:8.8.8.8",
  ])("allows %p", (ip) => {
    expect(isPublicAddress(ip)).toBe(true);
  });
});

describe("refusing a URL before any request", () => {
  it.each([
    "http://localhost/",
    "http://LOCALHOST./",
    "http://a.localhost/",
    "http://printer.local/",
    "http://ip-10-0-0-1.ec2.internal/",
    "http://backend:1337/",
    "http://127.0.0.1/",
    "http://2130706433/",
    "http://0177.0.0.1/",
    "http://0x7f.1/",
    "http://[::1]/",
    "http://[::ffff:127.0.0.1]/",
    "http://[fc00::1]/",
    "http://169.254.169.254/latest/meta-data/",
    "http://0.0.0.0:3000/",
  ])("refuses %p as a private address", async (url) => {
    expect(await checkOne(url, { send: noSend })).toEqual({
      kind: "refused",
      finalUrl: url,
      reason: "private-address",
    });
  });

  it.each([
    "ftp://example.com/",
    "file:///etc/passwd",
    "javascript:alert(1)",
    "data:text/plain,hi",
    "mailto:a@example.com",
  ])("refuses %p as an unsupported scheme", async (url) => {
    expect(await checkOne(url, { send: noSend })).toMatchObject({
      kind: "refused",
      reason: "unsupported-scheme",
    });
  });

  it.each(["not a url", "/uploads/x.csv", ""])(
    "refuses %p as an invalid URL",
    async (url) => {
      expect(await checkOne(url, { send: noSend })).toMatchObject({
        kind: "refused",
        reason: "invalid-url",
      });
    },
  );
});

describe("the resolved address (real http.request, fake DNS)", () => {
  it.each(["127.0.0.1", "169.254.169.254"])(
    "refuses a public name that resolves to %p",
    async (address) => {
      const lookup = fakeLookup(v4(address));

      expect(await checkOne("http://rebind.test/x", { lookup })).toEqual({
        kind: "refused",
        finalUrl: "http://rebind.test/x",
        reason: "private-address",
      });
      expect(lookup).toHaveBeenCalledWith(
        "rebind.test",
        expect.objectContaining({ all: true }),
        expect.any(Function),
      );
    },
  );

  it.each(["::ffff:127.0.0.1", "fd00::1"])(
    "refuses a name that resolves to %p",
    async (address) => {
      const lookup = fakeLookup(v6(address));

      expect(await checkOne("https://rebind.test/", { lookup })).toMatchObject({
        kind: "refused",
        reason: "private-address",
      });
    },
  );

  it("refuses a name when any of its addresses is private", async () => {
    const lookup = fakeLookup(v4("93.184.216.34"), v4("10.0.0.5"));

    expect(await checkOne("http://mixed.test/", { lookup })).toMatchObject({
      kind: "refused",
      reason: "private-address",
    });
  });

  it("calls a host that doesn't exist broken, with no status", async () => {
    const lookup = jest.fn(((_host, _options, callback) => {
      const error = Object.assign(new Error("getaddrinfo ENOTFOUND"), {
        code: "ENOTFOUND",
      });
      process.nextTick(() => callback(error, ""));
    }) as LookupFunction);

    expect(await checkOne("http://nope.test/", { lookup })).toEqual({
      kind: "broken",
      finalUrl: "http://nope.test/",
      status: null,
    });
  });
});

describe("what a request sends", () => {
  it("sends only User-Agent and Accept, never the URL's credentials, on its own socket", async () => {
    const fetchSpy = jest.fn();
    const realFetch = global.fetch;
    global.fetch = fetchSpy;
    const request = jest.spyOn(http, "request").mockImplementation((() => {
      const req = Object.assign(new EventEmitter(), {
        end: () =>
          process.nextTick(() =>
            req.emit(
              "error",
              Object.assign(new Error("refused"), { code: "ECONNREFUSED" }),
            ),
          ),
        destroy: jest.fn(),
      });
      return req;
    }) as unknown as typeof http.request);

    try {
      const url = "http://user:pass@example.com/a?b#c";
      expect(
        await checkOne(url, { lookup: fakeLookup(v4("8.8.8.8")) }),
      ).toEqual({ kind: "unchecked", finalUrl: url, reason: "network-error" });

      const options = request.mock.calls[0][0] as http.RequestOptions;
      expect(options).toMatchObject({
        hostname: "example.com",
        path: "/a?b",
        method: "HEAD",
        agent: false,
      });
      expect(options.auth).toBeUndefined();
      expect(typeof options.lookup).toBe("function");
      expect(Object.keys(options.headers ?? {}).sort()).toEqual([
        "accept",
        "user-agent",
      ]);
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      request.mockRestore();
      global.fetch = realFetch;
    }
  });
});

describe("responses", () => {
  it.each<[string, HopResponse, object]>([
    [
      "200 with a content type and length",
      ok({ contentType: "image/png", bytes: 123 }),
      { kind: "loaded", status: 200, contentType: "image/png", bytes: 123 },
    ],
    ["204", ok({ status: 204 }), { kind: "loaded", status: 204, bytes: null }],
    ["304", ok({ status: 304 }), { kind: "loaded", status: 304 }],
    ["404", ok({ status: 404 }), { kind: "broken", status: 404 }],
    ["410", ok({ status: 410 }), { kind: "broken", status: 410 }],
    ["401", ok({ status: 401 }), { kind: "broken", status: 401 }],
    ["403", ok({ status: 403 }), { kind: "broken", status: 403 }],
    ["500", ok({ status: 500 }), { kind: "broken", status: 500 }],
    ["503", ok({ status: 503 }), { kind: "broken", status: 503 }],
    ["429", ok({ status: 429 }), { kind: "unchecked", reason: "rate-limited" }],
    [
      "600",
      ok({ status: 600 }),
      { kind: "unchecked", reason: "network-error" },
    ],
  ])("maps %s", async (_label, res, expected) => {
    const send = jest.fn<ReturnType<Send>, Parameters<Send>>(async () => res);

    expect(await checkOne("https://example.com/", { send })).toMatchObject({
      finalUrl: "https://example.com/",
      ...expected,
    });
  });

  it.each<[string, number[], object]>([
    ["HEAD 405, then GET 200", [405, 200], { kind: "loaded", status: 200 }],
    ["HEAD 403, then GET 403", [403, 403], { kind: "broken", status: 403 }],
    ["HEAD 429, no GET", [429], { kind: "unchecked", reason: "rate-limited" }],
    ["HEAD 200, no GET", [200], { kind: "loaded", status: 200 }],
  ])("%s", async (_label, statuses, expected) => {
    const answers = [...statuses];
    const send = jest.fn<ReturnType<Send>, Parameters<Send>>(async () =>
      ok({ status: answers.shift() }),
    );

    expect(await checkOne("https://example.com/", { send })).toMatchObject(
      expected,
    );
    expect(send.mock.calls.map(([hop]) => hop.method)).toEqual(
      ["HEAD", "GET"].slice(0, statuses.length),
    );
  });
});

describe("redirects", () => {
  it("refuses a public URL that redirects to the AWS metadata address", async () => {
    const send = jest.fn<ReturnType<Send>, Parameters<Send>>(async () =>
      redirect("http://169.254.169.254/latest/meta-data/"),
    );

    expect(await checkOne("https://public.example/", { send })).toEqual({
      kind: "refused",
      finalUrl: "http://169.254.169.254/latest/meta-data/",
      reason: "private-address",
    });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("refuses a redirect to another scheme", async () => {
    const send: Send = async () => redirect("ftp://example.com/file");

    expect(await checkOne("https://example.com/", { send })).toMatchObject({
      kind: "refused",
      reason: "unsupported-scheme",
    });
  });

  it("follows a relative Location from the hop it came from", async () => {
    const send = jest.fn<ReturnType<Send>, Parameters<Send>>(async ({ url }) =>
      url.pathname === "/a/start" ? redirect("../b") : ok(),
    );

    expect(await checkOne("https://example.com/a/start", { send })).toEqual(
      expect.objectContaining({
        kind: "loaded",
        finalUrl: "https://example.com/b",
      }),
    );
  });

  it("follows five redirects", async () => {
    const send: Send = async ({ url }) => {
      const n = Number(url.pathname.slice(1));
      return n < 5 ? redirect(`/${n + 1}`) : ok();
    };

    expect(await checkOne("https://example.com/0", { send })).toMatchObject({
      kind: "loaded",
      finalUrl: "https://example.com/5",
    });
  });

  it("stops at the sixth redirect", async () => {
    const send = jest.fn<ReturnType<Send>, Parameters<Send>>(async ({ url }) =>
      redirect(`/${Number(url.pathname.slice(1)) + 1}`),
    );

    expect(await checkOne("https://example.com/0", { send })).toEqual({
      kind: "unchecked",
      finalUrl: "https://example.com/5",
      reason: "too-many-redirects",
    });
    expect(send).toHaveBeenCalledTimes(6);
  });
});

describe("time limits", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  it("gives up on a URL after 5 s, not before", async () => {
    const fetchUrl = createSafeFetcher({ send: neverAnswers });
    let result: unknown;
    void fetchUrl("https://slow.example/").then((r) => (result = r));

    await jest.advanceTimersByTimeAsync(4_999);
    expect(result).toBeUndefined();
    await jest.advanceTimersByTimeAsync(1);
    expect(result).toEqual({
      kind: "unchecked",
      finalUrl: "https://slow.example/",
      reason: "timeout",
    });
  });

  it("counts every hop against the URL's 5 s", async () => {
    // Three 2 s hops: /0 → /1 → /2, then 200
    const send: Send = ({ url }) => {
      const n = Number(url.pathname.slice(1));
      return delayed(n === 2 ? ok() : redirect(`/${n + 1}`), 2_000);
    };
    const pending = checkUrls(["https://example.com/0"], { send });

    await jest.advanceTimersByTimeAsync(6_000);
    expect((await pending).get("https://example.com/0")).toMatchObject({
      kind: "unchecked",
      reason: "timeout",
    });
  });

  it("runs 6 at a time and stops at the scan's 20 s, never calling a URL broken", async () => {
    let inFlight = 0;
    let most = 0;
    const send = jest.fn<ReturnType<Send>, Parameters<Send>>(async () => {
      most = Math.max(most, ++inFlight);
      try {
        return await delayed(ok(), 4_500);
      } finally {
        inFlight--;
      }
    });
    const fetchUrl = createSafeFetcher({ send });
    const urls = Array.from({ length: 30 }, (_, i) => `https://e.com/${i}`);
    const pending = Promise.all(urls.map((u) => fetchUrl(u)));

    await jest.advanceTimersByTimeAsync(20_000);
    const results = await pending;

    expect(most).toBe(6);
    expect(results.filter((r) => r.kind === "loaded")).toHaveLength(24);
    expect(results.slice(24)).toEqual(
      urls.slice(24).map((u) => ({
        kind: "unchecked",
        finalUrl: u,
        reason: "budget",
      })),
    );

    send.mockClear();
    expect(await fetchUrl("https://late.example/")).toMatchObject({
      reason: "budget",
    });
    expect(send).not.toHaveBeenCalled();
  });
});

describe("the per-scan cache", () => {
  it("fetches a URL once per scan", async () => {
    const send = jest.fn<ReturnType<Send>, Parameters<Send>>(async () => ok());
    const fetchUrl = createSafeFetcher({ send });

    const [a, b] = await Promise.all([
      fetchUrl("https://example.com/"),
      fetchUrl("https://example.com/"),
    ]);
    const map = await checkUrls(["https://x.com/", "https://x.com/"], { send });

    expect(a).toBe(b);
    expect(map.size).toBe(1);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("returns an empty map for no URLs", async () => {
    expect(await checkUrls([])).toEqual(new Map());
  });
});
