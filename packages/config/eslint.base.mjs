// Shared ESLint flat-config base. Apps and packages extend this.
// Usage:
//   import base from "@workspace/config/eslint.base.mjs";
//   export default [...base, { rules: { ... } }];

import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export const baseRules = {
  "@typescript-eslint/no-explicit-any": "off",
  "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
  "@typescript-eslint/no-non-null-assertion": "off",
  "@typescript-eslint/ban-ts-comment": "off",
  "react-hooks/exhaustive-deps": "off",
  "react/no-unescaped-entities": "off",
  "react/display-name": "off",
  "react/prop-types": "off",
  "@next/next/no-img-element": "off",
  "prefer-const": "warn",
  "no-console": ["warn", { allow: ["warn", "error", "info"] }],
  "no-debugger": "warn",
  "no-empty": "warn",
  "no-unreachable": "warn"
};

export const baseIgnores = [
  "node_modules/**",
  ".next/**",
  "out/**",
  "build/**",
  "dist/**",
  "next-env.d.ts",
  "examples/**",
  "skills/**",
  "download/**",
  "upload/**"
];

export const nextPreset = [...nextCoreWebVitals, ...nextTypescript];

export default [...nextPreset, { rules: baseRules }, { ignores: baseIgnores }];
