/**
 * Tests for the custom cache handler (frontend/cache-handler.js).
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * Next.js 15's default FileSystemCache only honors the FIRST revalidateTag()
 * for a tag per server process. After that, entries written later are treated
 * as fresh forever — which is why a newly created group (e.g. the 26th) never
 * appeared on /g/dashboard until the server restarted.
 *
 * `isStale(tags, lastModified)` is the exact check Next runs when it reads a
 * cached fetch. These tests drive the handler the way the app does: revalidate,
 * let the page write a fresh entry, revalidate again.
 */
import { isStale } from "next/dist/server/lib/incremental-cache/tags-manifest.external.js";
import FileSystemCache from "next/dist/server/lib/incremental-cache/file-system-cache.js";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const CacheHandler = require("../../cache-handler.js");

function makeHandler(Handler: typeof CacheHandler) {
  return new Handler({
    fs: require("fs"),
    flushToDisk: false,
    serverDistDir: "/tmp/cache-handler-test",
    maxMemoryCacheSize: 1_000_000,
    revalidatedTags: [],
  });
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 5));

/** A unique tag per test, since the tags manifest is process-global. */
let n = 0;
const uniqueTag = () => `cache-handler-test-${Date.now()}-${n++}`;

describe("cache-handler — repeated revalidateTag", () => {
  it("invalidates an entry written after an earlier revalidation (the 26th-group bug)", async () => {
    const handler = makeHandler(CacheHandler);
    const tag = uniqueTag();

    await handler.revalidateTag(tag); // e.g. a group is created
    await tick();
    const entryWritten = Date.now(); // dashboard refetches -> new entry
    await tick();
    await handler.revalidateTag(tag); // another group is created

    expect(isStale([tag], entryWritten)).toBe(true);
  });

  it("keeps invalidating on every revalidation, not just the second", async () => {
    const handler = makeHandler(CacheHandler);
    const tag = uniqueTag();

    for (let i = 0; i < 5; i++) {
      await handler.revalidateTag(tag);
      await tick();
      const entryWritten = Date.now();
      await tick();
      await handler.revalidateTag(tag);
      expect(isStale([tag], entryWritten)).toBe(true);
    }
  });

  it("treats an entry written after the latest revalidation as fresh", async () => {
    const handler = makeHandler(CacheHandler);
    const tag = uniqueTag();

    await handler.revalidateTag(tag);
    await tick();

    expect(isStale([tag], Date.now())).toBe(false);
  });

  it("accepts a single tag string as well as an array", async () => {
    const handler = makeHandler(CacheHandler);
    const a = uniqueTag();
    const b = uniqueTag();
    const entryWritten = Date.now() - 1000;

    await handler.revalidateTag(a);
    await handler.revalidateTag([b]);

    expect(isStale([a], entryWritten)).toBe(true);
    expect(isStale([b], entryWritten)).toBe(true);
  });

  it("does not affect tags that were never revalidated", async () => {
    const handler = makeHandler(CacheHandler);
    await handler.revalidateTag(uniqueTag());

    expect(isStale([uniqueTag()], Date.now() - 1000)).toBe(false);
  });

  it("is a drop-in FileSystemCache (inherits get/set)", () => {
    const handler = makeHandler(CacheHandler);
    expect(handler).toBeInstanceOf(FileSystemCache);
    expect(typeof handler.get).toBe("function");
    expect(typeof handler.set).toBe("function");
  });

  // Documents the upstream bug this handler exists to fix. If this starts
  // failing, Next.js has fixed it and cache-handler.js can be removed.
  it("confirms Next's default handler still has the bug", async () => {
    const handler = makeHandler(FileSystemCache);
    const tag = uniqueTag();

    await handler.revalidateTag(tag);
    await tick();
    const entryWritten = Date.now();
    await tick();
    await handler.revalidateTag(tag);

    expect(isStale([tag], entryWritten)).toBe(false);
  });
});
