const nextJest = require("next/jest");

const createJestConfig = nextJest({
  dir: "./",
});

// Run all tests in UTC to prevent timezone-dependent failures
process.env.TZ = "UTC";

/** @type {import('jest').Config} */
const config = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testEnvironment: "jsdom",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^@uiw/react-codemirror$": "<rootDir>/__mocks__/@uiw/react-codemirror.js",
    // ESM-only, with an "import" export condition Jest doesn't match
    "^@handlewithcare/prosemirror-inputrules$":
      "<rootDir>/node_modules/@handlewithcare/prosemirror-inputrules/dist/index.js",
    "^@uiw/codemirror-theme-github$":
      "<rootDir>/__mocks__/@uiw/codemirror-theme-github.js",
  },
  transform: {
    "^.+\\.(ts|tsx|js|jsx)$": ["babel-jest", { presets: ["next/babel"] }],
  },
  moduleDirectories: ["node_modules", "<rootDir>"],
  testEnvironmentOptions: {
    customExportConditions: ["node", "default"],
  },
  globals: {
    "ts-jest": {
      tsconfig: "./tsconfig.json",
    },
  },
  testPathIgnorePatterns: ["/e2e/", "/playwright-report/", "/test-results/"],
};

// next/jest ignores all node_modules and appends our patterns after its own,
// so un-ignore the ESM-only packages BlockNote 0.57 needs here instead.
module.exports = async () => {
  const resolved = await createJestConfig(config)();
  resolved.transformIgnorePatterns = [
    "/node_modules/(?!(@blocknote|lib0|@handlewithcare)/)",
    "^.+\\.module\\.(css|sass|scss)$",
  ];
  return resolved;
};
