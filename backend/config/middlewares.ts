export default [
  {
    name: "strapi::security",
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          "connect-src": ["'self'", "https:"],
          "img-src": [
            "'self'",
            "data:",
            "blob:",
            "market-assets.strapi.io",
            process.env.AWS_CDN_URL,
          ],
          "media-src": [
            "'self'",
            "data:",
            "blob:",
            "market-assets.strapi.io",
            process.env.AWS_CDN_URL,
          ],
          upgradeInsecureRequests: null,
        },
      },
    },
  },
  "strapi::logger",
  "strapi::errors",
  // gzip JSON responses (list queries can be large). Brotli is off to keep
  // CPU cost low on small tasks; koa-compress skips bodies under 1 KB.
  { name: "strapi::compression", config: { br: false } },
  "strapi::cors",
  "strapi::poweredBy",
  "strapi::query",
  "strapi::body",
  "strapi::session",
  "strapi::favicon",
  "strapi::public",
];
