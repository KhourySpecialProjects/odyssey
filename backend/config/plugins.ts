export default ({ env }) => ({
  upload: env("AWS_S3_BUCKET")
    ? {
        config: {
          sizeLimit: 100 * 1024 * 1024,
          provider: "aws-s3",
          providerOptions: {
            baseUrl: env("AWS_CDN_URL"),
            rootPath: env("AWS_CDN_ROOT_PATH"),
            s3Options: {
              // Without both keys, omit credentials so the AWS default credential chain applies.
              ...(env("AWS_S3_ACCESS_KEY") && env("AWS_S3_SECRET_KEY")
                ? {
                    credentials: {
                      accessKeyId: env("AWS_S3_ACCESS_KEY"),
                      secretAccessKey: env("AWS_S3_SECRET_KEY"),
                    },
                  }
                : {}),
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
      }
    : {
        config: {
          sizeLimit: 100 * 1024 * 1024,
          provider: "local",
        },
      },
});
