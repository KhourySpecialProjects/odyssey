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
  },
  transform: {
    "^.+\\.(ts|tsx|js|jsx)$": ["babel-jest", { presets: ["next/babel"] }],
  },
  transformIgnorePatterns: [
    "/node_modules/(?!(@panva|jose|openid-client|flat|@lemonsqueezy|next-auth|uuid|@smithy|@aws-sdk|@microsoft|node-fetch|isomorphic-dompurify|react-dnd|react-dnd-html5-backend|lowlight|@blocknote|prosemirror-highlight|papaparse|@tanstack)(/.*)?)",
  ],
  moduleDirectories: ["node_modules", "<rootDir>"],
  testEnvironmentOptions: {
    customExportConditions: ["react-native", "node", "default"],
  },
  globals: {
    "ts-jest": {
      tsconfig: "./tsconfig.json",
    },
  },
  testPathIgnorePatterns: ["/e2e/", "/playwright-report/", "/test-results/"],
};

module.exports = createJestConfig(config);
