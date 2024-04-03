export default ({ env }) => ({
  documentation: {
    enabled: true,
    config: {
      openapi: "3.0.0",
      info: {
        version: "1.0.0",
        title: "Khoury Odyssey CMS: API Docs",
        description:
          "API documentation for Khoury Odyssey's content management system.",
        termsOfService: null,
        contact: {
          name: "Khoury Odyssey Team",
          email: "khouryodyssey@northeastern.edu",
          url: "https://khouryodyssey.org",
        },
        license: null,
      },
      "x-strapi-config": {
        // Leave empty to ignore plugins during generation
        // plugins: ["upload", "users-permissions"],
        plugins: ["upload"],
        path: "/documentation",
      },
      servers: [
        { url: "http://localhost:1337/api", description: "Development server" },
        {
          url: "https://data.khouryodyssey.org/api",
          description: "Production server",
        },
      ],
      externalDocs: {
        description: "Strapi Docs",
        url: "https://docs.strapi.io/developer-docs/latest/getting-started/introduction.html",
      },
      security: [{ bearerAuth: [] }],
    },
  },
  upload: {
    config: {
      provider: "aws-s3",
      providerOptions: {
        baseUrl: env("DO_CDN_URL"),
        rootPath: env("DO_CDN_ROOT_PATH"),
        s3Options: {
          accessKeyId: env("DO_SPACE_ACCESS_KEY"),
          secretAccessKey: env("DO_SPACE_SECRET_KEY"),
          region: env("DO_SPACE_REGION"),
          endpoint: env("DO_SPACE_ENDPOINT"),
          params: {
            Bucket: env("DO_SPACE_BUCKET"),
          },
        },
      },
      actionOptions: {
        upload: {},
        uploadStream: {},
        delete: {},
      },
    },
  },
});
