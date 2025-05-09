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
          url: "https://www.data.khouryodyssey.org/api",
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
        baseUrl: env("AWS_CDN_URL"),
        rootPath: env("AWS_CDN_ROOT_PATH"),
        s3Options: {
          accessKeyId: env("AWS_S3_ACCESS_KEY"),
          secretAccessKey: env("AWS_S3_SECRET_KEY"),
          region: env("AWS_S3_REGION"),
          endpoint: env("AWS_S3_ENDPOINT"),
          params: {
            Bucket: env("AWS_S3_BUCKET"),
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
