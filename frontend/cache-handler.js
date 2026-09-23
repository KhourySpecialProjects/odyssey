// Custom Next.js cache handler — works around a bug in Next.js 15.
//
// Next's default FileSystemCache.revalidateTag only records a tag's
// invalidation time the FIRST time that tag is revalidated in a server
// process (`if (!tagsManifest.has(tag)) tagsManifest.set(tag, Date.now())`).
// Every later revalidateTag() for the same tag is silently ignored, so any
// cache entry written after the first call is treated as fresh forever.
// Symptom: e.g. a new group only appears on /g/dashboard after a restart.
//
// Present in every release from 15.5.9 through 15.5.26. This subclass keeps all
// of Next's caching behavior and only fixes revalidateTag to stamp the tag on
// every call. Remove it once Next.js ships a fix.
const FileSystemCache =
  require("next/dist/server/lib/incremental-cache/file-system-cache.js").default;
const {
  tagsManifest,
} = require("next/dist/server/lib/incremental-cache/tags-manifest.external.js");

class CacheHandler extends FileSystemCache {
  async revalidateTag(tags) {
    const list = typeof tags === "string" ? [tags] : tags;
    const now = Date.now();
    for (const tag of list) {
      tagsManifest.set(tag, now);
    }
  }
}

module.exports = CacheHandler;
