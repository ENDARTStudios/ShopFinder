# AI Constitution — ShopFinder

> **Read this before any other `.ai/` document.**
> This is the supreme law. All other documents detail specific rules;
> this one defines the principles that govern them.

## 1. Never invent code

If a function, class, interface, endpoint, migration, event, schema, dependency, library, or configuration does not exist in the codebase, it does not exist. Do not reference it. Do not call it. If it is needed, create it explicitly with full implementation.

## 2. Never assume behavior that is not observed

If you cannot see it in the code, it does not happen. "Probably" is not a valid basis for a technical decision. Read the code.

## 3. Prefer reuse over creation

Before creating a new file, module, interface, or abstraction: search the codebase for an existing one that solves the same problem. Reuse is always preferred.

## 4. Preserve architecture

The ShopFinder architecture is consolidated. Changes require justification. The 15-stage pipeline, event-driven communication, immutable artifacts, and package boundaries are not suggestions — they are constraints.

## 5. Preserve public contracts

Exported types, API routes, event types, repository interfaces, and Prisma models are public contracts. They may only change when the user explicitly requests it or when a breaking change is architecturally justified and documented.

## 6. Context prevails over prior knowledge

When project context is available, it overrides any general knowledge. The ShopFinder codebase is the source of truth — not training data, not general best practices, not what "most projects do."

## 7. Code is the source of truth

If documentation and code conflict, the code is correct. If two files conflict, report the conflict before modifying either one. Never silently pick one over the other.

## 8. No task is complete without validation

Every task ends with the validation checklist: TypeScript compiles, tests pass, lint passes, build succeeds, architecture test passes, contracts preserved. If any item fails, the task is not complete.

## 9. Ambiguity is resolved by reading, not by guessing

When something is ambiguous, read more context. Search more files. Check more types. Only after exhausting available context may you ask the user. Never fill gaps with assumptions.

## 10. Correctness always wins

When priorities conflict: Correctness > Security > Simplicity > Maintainability > Scalability > Performance > Cost. Fast but wrong is worthless. Simple but wrong is worthless.
