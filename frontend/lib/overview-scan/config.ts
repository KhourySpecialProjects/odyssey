import { RUNNABLE_LANGUAGES } from "@/lib/code-languages";

// Every limit and list the scan's rules use, with the prototype's key names.
// ODY-793 added the media keys; ODY-790 adds the rest and RULES_VERSION.
// Never import network.ts here: it's server only.
export const CONFIG = {
  maxHeadingWords: 12,
  maxImageBytes: 2 * 1024 * 1024,
  videoHosts: [
    "www.youtube.com",
    "youtube.com",
    "youtu.be",
    "vimeo.com",
    "player.vimeo.com",
  ],
  // Odyssey's own media hosts come from these env vars at run time, as in
  // next.config.mjs. Names only.
  mediaHostEnv: ["AWS_CDN_URL", "AWS_S3_BUCKET_URL"],
  codeLanguages: RUNNABLE_LANGUAGES,
  sandpackTemplates: ["vanilla", "react", "react-ts"],
  vagueLinkText: ["here", "click here", "link", "this", "read more"],
  nonProdHosts: [
    /^localhost$/,
    /^127(\.\d+){3}$/,
    /^0\.0\.0\.0$/,
    /^\[::1\]$/,
    // dev/staging only as a subdomain label, so dev.to isn't flagged
    /(^|\.)dev\d*\.[^.]+\.[^.]+/,
    /(^|\.)staging\.[^.]+\.[^.]+/,
  ],
} as const;
