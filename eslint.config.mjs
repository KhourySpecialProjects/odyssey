import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import { defineConfig } from "eslint/config";

// The frontend lints with `next lint` (frontend/.eslintrc.json), which owns
// these rules. They are declared here as no-ops only so that
// `eslint-disable-next-line` comments naming them resolve in this root run.
const noop = { create: () => ({}) };
const frontendRuleStubs = {
  "react-hooks": { rules: { "exhaustive-deps": noop } },
  "@next/next": { rules: { "no-img-element": noop } },
};

export default defineConfig([
  // The no-op stubs never report, so their disable comments look unused here
  { linterOptions: { reportUnusedDisableDirectives: "off" } },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    plugins: {
      react: pluginReact,
      ...frontendRuleStubs,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      "react/react-in-jsx-scope": "off",
      "react/jsx-uses-react": "off",
    },
  },
  {
    files: ["**/__tests__/**/*.{js,jsx,ts,tsx}", "**/*.test.{js,jsx,ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.jest,
        ...globals.node,
      },
    },
  },
]);
