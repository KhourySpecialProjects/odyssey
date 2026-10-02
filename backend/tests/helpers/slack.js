const WEBHOOK_URL = 'https://hooks.slack.test/odyssey';

/**
 * Counts Slack webhook sends by spying on global fetch (lib/slack.ts uses it).
 * Call once at the top of a describe/test file; it installs beforeEach and
 * afterEach hooks.
 *
 * lib/slack.ts is a no-op unless NODE_ENV === "production". Strapi has to
 * boot as "test" (so config/env/test applies), so NODE_ENV is switched to
 * "production" only while a test runs. Strapi has already read its config by
 * then, and only the Slack helper reads NODE_ENV at call time.
 */
function useSlackSpy() {
  const state = { spy: null, previousNodeEnv: undefined };

  beforeEach(() => {
    state.previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    state.spy = jest.spyOn(global, 'fetch').mockImplementation(async () => ({
      ok: true,
      status: 200,
      text: async () => '',
    }));
  });

  afterEach(() => {
    process.env.NODE_ENV = state.previousNodeEnv;
    state.spy.mockRestore();
  });

  return {
    /** Parsed JSON payloads sent to the Slack webhook so far in this test. */
    sends: () =>
      state.spy.mock.calls
        .filter(([url]) => url === WEBHOOK_URL)
        .map(([, init]) => JSON.parse(init.body)),
    /** Reset the count mid-test, e.g. after creating fixtures. */
    reset: () => state.spy.mockClear(),
  };
}

module.exports = { useSlackSpy, WEBHOOK_URL };
