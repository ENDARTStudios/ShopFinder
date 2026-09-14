# Changesets

This project uses [Changesets](https://github.com/changesets/changesets) to manage
versions and changelogs for the `@workspace/*` packages.

## Workflow

1. Make your changes.
2. Run `bunx changeset` to create a changeset describing the change.
3. Commit the changeset alongside your code.
4. When the `release` GitHub Action runs (or you run `bunx changeset version`),
   the changeset is consumed and package versions + CHANGELOG.md are updated.

## Why (even for a solo project)

- Keeps a readable history of _what changed and why_ per package.
- Makes future extraction to standalone repos trivial.
- Zero cost: changesets are tiny markdown files.
