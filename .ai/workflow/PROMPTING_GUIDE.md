# Prompting Guide — Mandatory Structure

> Every task prompt must follow this exact order. Never invert.

## Mandatory prompt order

```
1. Full Context
       ↓
2. Project Constraints
       ↓
3. Architecture Constraints
       ↓
4. Task
       ↓
5. Acceptance Criteria
```

## 1. Full Context

Context always comes before the task. Provide:
- What exists in the codebase that is relevant
- File paths, type names, interface signatures
- Current behavior (what the code does today)
- Conversation history that establishes decisions
- Any constraints already agreed upon

Complete documentation is always preferable to summaries. Use the full context window — do not truncate or abbreviate when the information is relevant.

## 2. Project Constraints

State what cannot change:
- Package boundaries (`@workspace/domain` cannot import from `@workspace/database`)
- Prisma schema (unless explicitly modifying)
- Public API contracts
- Event types
- Artifact immutability
- Architecture test rules (0 violations must be maintained)

## 3. Architecture Constraints

State how the code must fit:
- Which package the code belongs in
- Which patterns are used in neighboring files
- Which types must be implemented
- Which events must be emitted
- Which repository interface must be satisfied

## 4. Task

Only after context, constraints, and architecture are established, state the task:
- What to create, modify, or delete
- Expected behavior after completion
- Files to touch (explicit paths)

## 5. Acceptance Criteria

Define what "done" means:
- TypeScript compiles with 0 errors
- ESLint passes with 0 warnings
- Build succeeds
- Tests pass (if applicable)
- Architecture test passes (0 violations)
- Public contracts preserved
- Imports are valid

## Rules

- **Never** state the task before the context.
- **Never** skip constraints to save tokens.
- **Never** abbreviate context when the full window is available.
- **Always** resolve ambiguities by reading more context, not by asking the user to clarify what the codebase already answers.
- **Always** prefer reading a file over guessing its contents.

## Anti-patterns (forbidden)

```
❌ "Create a product repository."
   (No context, no constraints, no architecture)

❌ "Add a new endpoint for searching products."
   (What exists? What types? What database schema?)

✅ Full context → constraints → architecture → task → criteria
```
