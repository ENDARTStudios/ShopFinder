// Root Prettier config — re-exports the shared config from @workspace/config.
import shared from "@workspace/config/prettier.config.mjs";

/** @type {import("prettier").Config} */
export default {
  ...shared,
  // Project-specific overrides go here.
  overrides: [
    {
      files: ["*.md", "*.mdx"],
      options: { proseWrap: "preserve" }
    },
    {
      files: ["*.json", "*.jsonc"],
      options: { trailingComma: "none" }
    }
  ]
};
