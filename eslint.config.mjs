import globals from "globals";
import js from "@eslint/js";
import json from "@eslint/json";
import markdown from "@eslint/markdown";
import css from "@eslint/css";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";

const browserExt = { sourceType: "module", globals: { ...globals.browser, ...globals.webextensions } };
const sharedRules = { semi: ["error", "always"], "no-extra-semi":"error" };

export default defineConfig([
  { ignores: ["dist/", "node_modules/", "package-lock.json"] },
  {
    files: ["*.mjs", "*.js"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: { sourceType: "module", globals: { ...globals.node }},
    rules: sharedRules
  }, {
    files: ["src/**/*.{js,mjs}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: browserExt,
    rules: sharedRules
  }, {
    files: ["src/**/*.ts"],
    extends: [...tseslint.configs.recommended],
    languageOptions: { ...browserExt, parser: tseslint.parser },
    rules: sharedRules
  },
  { files: ["**/*.json"], plugins: { json }, language: "json/json", extends: ["json/recommended"] },
  { files: ["**/*.md"], plugins: { markdown }, language: "markdown/commonmark", extends: ["markdown/recommended"] },
  { files: ["src/**/*.css"], plugins: { css }, language: "css/css", extends: ["css/recommended"] },
]);
