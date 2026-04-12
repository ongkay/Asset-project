import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import prettierConfig from "eslint-config-prettier/flat";
import { defineConfig } from "eslint/config";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

const sourceFiles = ["**/*.{js,mjs,cjs,jsx,ts,tsx,mts,cts}"];
const tsFiles = ["**/*.{ts,tsx,mts,cts}"];
const tsRecommended = tseslint.configs.recommended.map((config) =>
  config.files ? config : { ...config, files: tsFiles },
);

export default defineConfig([
  {
    ignores: [
      ".next/**",
      "dist/**",
      "out/**",
      "coverage/**",
      "node_modules/**",
      "src/components/ui/**",
      ".docs/**",
      "docs/**",
      ".worktrees/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      ".agents/**",
      ".bp/**",
    ],
  },
  js.configs.recommended,
  ...tsRecommended,
  reactPlugin.configs.flat.recommended,
  reactPlugin.configs.flat["jsx-runtime"],
  {
    files: sourceFiles,
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      "@next/next": nextPlugin,
      "react-hooks": reactHooksPlugin,
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      ...reactHooksPlugin.configs.recommended.rules,
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      "react-hooks/incompatible-library": "off",
      "react/prop-types": "off",
      "no-else-return": ["error", { allowElseIf: false }],
      "no-param-reassign": "error",
      "react/self-closing-comp": "error",
    },
  },
  {
    files: tsFiles,
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    files: ["src/components/ui/**/*.{js,mjs,cjs,jsx,ts,tsx,mts,cts}"],
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
      "no-else-return": "off",
      "no-param-reassign": "off",
      "react/self-closing-comp": "off",
    },
  },
  prettierConfig,
]);
