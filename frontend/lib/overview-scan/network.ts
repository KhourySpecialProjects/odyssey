import "server-only";

import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import net, { type LookupFunction } from "node:net";

/**
 * The overview scan's safe fetcher (ODY-789): the only code that requests a
 * URL a user typed. Server only, and deliberately not "use server": as an
 * endpoint it would be an open proxy.
 *
 * It never fetches a private, loopback or link-local address. The address
 * check runs inside the socket's own DNS lookup, so the address that's checked
 * is the address that's connected to, and every redirect is checked again.
 * Response bodies are never read.
 */

export type RefusedReason =
  | "invalid-url" // not an absolute URL (relative URLs included)
  | "unsupported-scheme" // not http: or https:
  | "private-address"; // the host, a resolved address or a redirect target isn't public

export type UncheckedReason =
  | "timeout" // the URL's 5 s ran out
  | "budget" // the scan's 20 s ran out first
  | "too-many-redirects" // still redirecting after 5 redirects
  | "rate-limited" // 429
  | "network-error"; // connection reset or refused, TLS failure, odd status

export type UrlLoaded = {
  kind: "loaded";
  finalUrl: string; // after redirects
  status: number; // 2xx, or a 3xx with no Location
  contentType: string | null; // lowercased media type, no parameters
  bytes: number | null; // Content-Length, or null when absent
};

export type UrlBroken = {
  kind: "broken";
  finalUrl: string;
  status: number | null; // 4xx or 5xx; null = the host doesn't exist
};

export type UrlRefused = {
  kind: "refused";
  finalUrl: string; // the URL that was refused (a redirect target, perhaps)
  reason: RefusedReason;
};

export type UrlUnchecked = {
  kind: "unchecked";
  finalUrl: string;
  reason: UncheckedReason;
};

export type UrlCheck = UrlLoaded | UrlBroken | UrlRefused | UrlUnchecked;

export type FetchUrl = (url: string) => Promise<UrlCheck>; // never rejects

export type NetworkLimits = {
  urlTimeoutMs: number;
  maxConcurrent: number;
  budgetMs: number;
  maxRedirects: number;
};

export const NETWORK_LIMITS: NetworkLimits = {
  urlTimeoutMs: 5_000,
  maxConcurrent: 6,
  budgetMs: 20_000,
  maxRedirects: 5,
};

/** One HTTP request; the response headers, never the body. */
export type HopResponse = {
  status: number;
  contentType: string | null;
  bytes: number | null;
  location: string | null;
};

export type Send = (hop: {
  url: URL;
  method: "HEAD" | "GET";
  signal: AbortSignal;
  lookup: LookupFunction;
}) => Promise<HopResponse>;

export type SafeFetcherOptions = {
  lookup?: LookupFunction; // tests only
  send?: Send; // tests only
  limits?: Partial<NetworkLimits>;
};

function blockList(family: "ipv4" | "ipv6", cidrs: string[]) {
  const list = new net.BlockList();
  for (const cidr of cidrs) {
    const [address, prefix] = cidr.split("/");
    list.addSubnet(address, Number(prefix), family);
  }
  return list;
}

const DENY_V4 = blockList("ipv4", [
  "0.0.0.0/8", // "this host": 0.0.0.0 reaches localhost on Linux
  "10.0.0.0/8",
  "100.64.0.0/10", // carrier-grade NAT
  "127.0.0.0/8",
  "169.254.0.0/16", // link-local, incl. 169.254.169.254 (AWS metadata)
  "172.16.0.0/12",
  "192.0.0.0/24",
  "192.0.2.0/24",
  "192.88.99.0/24",
  "192.168.0.0/16",
  "198.18.0.0/15",
  "198.51.100.0/24",
  "203.0.113.0/24",
  "224.0.0.0/4", // multicast
  "240.0.0.0/4", // reserved, incl. 255.255.255.255
]);
// IPv6 is an allowlist: only global unicast, so ::, ::1, fc00::/7, fe80::/10,
// multicast and NAT64 (64:ff9b::/96) are refused without being listed.
const GLOBAL_V6 = blockList("ipv6", ["2000::/3"]);
const DENY_V6 = blockList("ipv6", [
  "2001::/23", // protocol assignments, incl. Teredo (embeds IPv4)
  "2001:db8::/32",
  "2002::/16", // 6to4 (embeds IPv4)
  "3fff::/20",
]);
const MAPPED_V6 = blockList("ipv6", ["::ffff:0:0/96"]);

export function isPublicAddress(ip: string): boolean {
  try {
    const family = net.isIP(ip);
    if (family === 4) return !DENY_V4.check(ip, "ipv4");
    if (family !== 6) return false;
    // BlockList matches IPv4 rules against IPv4-mapped addresses
    if (MAPPED_V6.check(ip, "ipv6")) return !DENY_V4.check(ip, "ipv6");
    return GLOBAL_V6.check(ip, "ipv6") && !DENY_V6.check(ip, "ipv6");
  } catch {
    return false;
  }
}

// Names refused before any lookup. Defense in depth: the real control is the
// resolved-address check in safeLookup.
function isPublicName(host: string) {
  return host.includes(".") && !/(^|\.)(localhost|local|internal)$/.test(host);
}

const refused = (finalUrl: string, reason: RefusedReason): UrlRefused => ({
  kind: "refused",
  finalUrl,
  reason,
});

const unchecked = (
  finalUrl: string,
  reason: UncheckedReason,
): UrlUnchecked => ({ kind: "unchecked", finalUrl, reason });

const bareHost = (url: URL) => url.hostname.replace(/^\[|\]$/g, "");

/** Parses and checks a URL before any request; WHATWG URL has already
 * normalized decimal, octal and hex IPv4. */
function preflight(input: string): URL | UrlRefused {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return refused(input, "invalid-url");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:")
    return refused(input, "unsupported-scheme");
  const host = bareHost(url).toLowerCase().replace(/\.+$/, "");
  const ok = net.isIP(host) ? isPublicAddress(host) : isPublicName(host);
  return ok ? url : refused(input, "private-address");
}

class RefusedAddressError extends Error {
  code = "ODY_REFUSED_ADDRESS";
}

/** Wraps a DNS lookup so every address it returns must be public. Node calls
 * it for the socket it's about to open, so there's no second resolution to
 * rebind. (Node skips lookup for IP literals; preflight checks those.) */
function safeLookup(lookup: LookupFunction): LookupFunction {
  return (hostname, options, callback) => {
    lookup(hostname, { ...options, all: true }, (error, result) => {
      if (error) return callback(error, "");
      const addresses = Array.isArray(result) ? result : [];
      if (
        !addresses.length ||
        !addresses.every((a) => isPublicAddress(a.address))
      )
        return callback(new RefusedAddressError(), "");
      if (options.all) return callback(null, addresses);
      callback(null, addresses[0].address, addresses[0].family);
    });
  };
}

// Nothing else: no cookies, no Authorization, no tokens
const REQUEST_HEADERS = {
  "user-agent": "OdysseyScan/1.0 (+https://khouryodyssey.org)",
  accept: "*/*",
};

const contentLength = (value: string | undefined) =>
  value && /^\d+$/.test(value) ? Number(value) : null;

const nodeSend: Send = ({ url, method, signal, lookup }) =>
  new Promise((resolve, reject) => {
    const client = url.protocol === "https:" ? https : http;
    // Built from parts: passing the URL would send its user:pass as auth
    const req = client.request(
      {
        protocol: url.protocol,
        hostname: bareHost(url),
        port: url.port || undefined,
        path: url.pathname + url.search,
        method,
        headers: REQUEST_HEADERS,
        lookup: safeLookup(lookup),
        agent: false,
        signal,
      },
      (res) => {
        const type = res.headers["content-type"];
        resolve({
          status: res.statusCode ?? 0,
          contentType: type?.split(";")[0].trim().toLowerCase() || null,
          bytes: contentLength(res.headers["content-length"]),
          location: res.headers.location ?? null,
        });
        res.destroy();
      },
    );
    req.on("error", reject);
    req.end();
  });

// Rejects as soon as the signal aborts, whatever the request is doing
function abortable<T>(promise: Promise<T>, signal: AbortSignal) {
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(signal.reason);
    if (signal.aborted) return onAbort();
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(resolve, reject).finally(() => {
      signal.removeEventListener("abort", onAbort);
    });
  });
}

function outcome(finalUrl: string, res: HopResponse): UrlCheck {
  const { status } = res;
  if (status === 429) return unchecked(finalUrl, "rate-limited");
  if (status >= 200 && status < 400)
    return {
      kind: "loaded",
      finalUrl,
      status,
      contentType: res.contentType,
      bytes: res.bytes,
    };
  if (status >= 400 && status < 600)
    return { kind: "broken", finalUrl, status };
  return unchecked(finalUrl, "network-error");
}

async function checkOne(
  first: URL,
  signal: AbortSignal,
  send: Send,
  lookup: LookupFunction,
  maxRedirects: number,
): Promise<UrlCheck> {
  let url = first;
  try {
    for (let hop = 0; ; hop++) {
      const request = (method: "HEAD" | "GET") =>
        abortable(send({ url, method, signal, lookup }), signal);
      let res = await request("HEAD");
      // Many servers answer HEAD wrongly, so any refusal gets one GET
      if (res.status >= 400 && res.status !== 429) res = await request("GET");
      if (res.status < 300 || res.status >= 400 || !res.location)
        return outcome(url.href, res);
      if (hop === maxRedirects)
        return unchecked(url.href, "too-many-redirects");
      let target = res.location;
      try {
        target = new URL(res.location, url).href;
      } catch {
        // preflight refuses it as invalid-url
      }
      const next = preflight(target);
      if (!(next instanceof URL)) return next;
      url = next;
    }
  } catch (error) {
    if (signal.aborted)
      return unchecked(
        url.href,
        signal.reason === "budget" ? "budget" : "timeout",
      );
    if (error instanceof RefusedAddressError)
      return refused(url.href, "private-address");
    if ((error as NodeJS.ErrnoException)?.code === "ENOTFOUND")
      return { kind: "broken", finalUrl: url.href, status: null };
    return unchecked(url.href, "network-error");
  }
}

/** One fetcher per scan: it caches each URL, runs 6 at a time, and its 20 s
 * budget starts now, so create it right before the checks run. */
export function createSafeFetcher(options: SafeFetcherOptions = {}): FetchUrl {
  const limits = { ...NETWORK_LIMITS, ...options.limits };
  const send = options.send ?? nodeSend;
  const lookup = options.lookup ?? (dns.lookup as LookupFunction);
  const deadline = Date.now() + limits.budgetMs;
  const cache = new Map<string, Promise<UrlCheck>>();
  const queue: (() => Promise<void>)[] = [];
  let active = 0;

  const pump = () => {
    while (active < limits.maxConcurrent && queue.length) {
      const job = queue.shift()!;
      active++;
      void job().finally(() => {
        active--;
        pump();
      });
    }
  };

  const run = async (input: string, url: URL): Promise<UrlCheck> => {
    const remaining = deadline - Date.now();
    if (remaining <= 0) return unchecked(input, "budget");
    const reason = remaining < limits.urlTimeoutMs ? "budget" : "timeout";
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(reason),
      Math.min(limits.urlTimeoutMs, remaining),
    );
    try {
      return await checkOne(
        url,
        controller.signal,
        send,
        lookup,
        limits.maxRedirects,
      );
    } catch {
      return unchecked(input, "network-error");
    } finally {
      clearTimeout(timer);
    }
  };

  return (input) => {
    let result = cache.get(input);
    if (!result) {
      const url = preflight(input);
      result =
        url instanceof URL
          ? new Promise<UrlCheck>((resolve) => {
              queue.push(() => run(input, url).then(resolve));
              pump();
            })
          : Promise.resolve(url);
      cache.set(input, result);
    }
    return result;
  };
}

export async function checkUrls(
  urls: readonly string[],
  options?: SafeFetcherOptions,
): Promise<Map<string, UrlCheck>> {
  const fetchUrl = createSafeFetcher(options);
  const unique = Array.from(new Set(urls));
  return new Map(
    await Promise.all(unique.map(async (u) => [u, await fetchUrl(u)] as const)),
  );
}
