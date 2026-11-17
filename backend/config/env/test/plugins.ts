// Test environment overrides, merged over config/plugins.ts when NODE_ENV=test.
export default () => ({
  // Keep the boot from rewriting the tracked documentation JSON under
  // src/extensions/documentation and src/api/*/documentation.
  documentation: { enabled: false },
  // Local provider, so tests never need S3.
  upload: { config: { provider: 'local', providerOptions: {} } },
});
