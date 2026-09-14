// lint-staged — runs only on staged files for fast pre-commit feedback.
/** @type {import("lint-staged").Configuration} */
export default {
  "*.{ts,tsx,js,jsx,mjs,cjs}": ["eslint --fix", "prettier --write"],
  "*.{json,jsonc,md,mdx,yml,yaml,css}": ["prettier --write"],
  "*.ts?(x)": () => "tsc --noEmit -p tsconfig.json"
};
