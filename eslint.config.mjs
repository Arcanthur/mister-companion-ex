import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";

const legacyCompatibilityRules = {
  "no-empty": "off",
  "no-control-regex": "off",
  "no-useless-escape": "off",
  "no-unused-vars": ["warn", { argsIgnorePattern: "^_", caughtErrors: "none" }],
};

export default [
  {
    ignores: [
      "dist/**",
      "release/**",
      "node_modules/**",
      "python-backend/**",
      "**/__pycache__/**",
    ],
  },
  js.configs.recommended,
  {
    files: ["src/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      ...legacyCompatibilityRules,
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  {
    files: ["electron/**/*.{js,cjs}", "scripts/**/*.{js,cjs}", "vite.config.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
    rules: legacyCompatibilityRules,
  },
];
