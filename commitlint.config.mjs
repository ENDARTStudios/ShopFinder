// Commitlint — enforces Conventional Commits.
// @see https://www.conventionalcommits.org
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      ["build", "chore", "ci", "docs", "feat", "fix", "perf", "refactor", "revert", "style", "test"]
    ],
    "subject-case": [0],
    "subject-max-length": [2, "always", 100],
    "header-max-length": [2, "always", 120],
    "body-leading-blank": [1, "always"],
    "footer-leading-blank": [1, "always"]
  }
};
