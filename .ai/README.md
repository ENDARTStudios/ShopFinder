# ShopFinder — AI Engineering Directives

> **Permanent, mandatory instruction set for all AI-assisted work on ShopFinder.**
> Read before every task. Follow without exception.

## Directory structure

```
.ai/
├── constitution/           # Static rules — never change unless principles change
│   ├── AI_CONSTITUTION.md      → Read FIRST. 10 supreme principles.
│   ├── ENGINEERING_RULES.md    → 10 non-negotiable engineering rules.
│   ├── CODING_RULES.md         → Code quality: complete, compilable, consistent.
│   ├── ARCHITECTURE_RULES.md   → Architecture preservation: reuse before create.
│   ├── DECISION_POLICY.md      → Correctness > Security > Simplicity > ...
│   └── VALIDATION_CHECKLIST.md → 10 items to verify before task complete.
│
├── knowledge/              # Stable project knowledge — changes rarely
│   ├── PROJECT_CONTEXT.md      → Purpose, what it is/is NOT, business rules.
│   ├── DOMAIN_MODEL.md         → 16 entities, invariants, relationships.
│   ├── ARCHITECTURE_MAP.md     → Package boundaries, dependency rules.
│   ├── PIPELINE.md             → 15 stages with I/O, events, invariants.
│   ├── DIRECTORY_GUIDE.md      → Where everything lives.
│   ├── STACK.md                → Technology table.
│   ├── CONVENTIONS.md          → Naming, formatting, structural conventions.
│   ├── GLOSSARY.md             → 40+ domain terms (Offer vs Canonical vs Catalog).
│   └── KNOWN_LIMITATIONS.md    → Known issues. Do NOT fix without request.
│
├── workflow/               # How to work — process and templates
│   ├── EXECUTION_PROTOCOL.md   → 6-step protocol before writing code.
│   ├── PROMPTING_GUIDE.md      → Mandatory prompt structure.
│   └── templates/              → Task templates (feature, refactor, bugfix, migration, connector)
│
├── state/                  # Project state — changes frequently
│   ├── ACTIVE_DECISIONS.md     → Settled decisions. Do NOT re-discuss.
│   ├── ARCHITECTURE_DECISIONS.md → ADRs: WHY each decision was made.
│   ├── ROADMAP.md              → Approved features only. Do NOT propose outside scope.
│   ├── OPEN_QUESTIONS.md       → Undefined items. Treat as open, not gaps.
│   ├── TECH_DEBT.md            → Accepted debt with reasons and triggers.
│   └── CHANGELOG_AI.md         → Evolution history for AI context.
│
├── context/                # High-density facts — no explanations
│   └── PROJECT_FACTS.md        → Numbers, names, lists. Pure data.
│
└── README.md               → This file.
```

## Reading order (mandatory)

### Before ANY task

1. `constitution/AI_CONSTITUTION.md` — supreme principles
2. `context/PROJECT_FACTS.md` — objective facts (numbers, names, lists)
3. `state/ACTIVE_DECISIONS.md` — what is already decided

### Before WRITING CODE

4. `knowledge/PROJECT_CONTEXT.md` — what ShopFinder is
5. `knowledge/DOMAIN_MODEL.md` — entities and relationships
6. `knowledge/ARCHITECTURE_MAP.md` — package boundaries
7. `workflow/EXECUTION_PROTOCOL.md` — 6-step protocol
8. `constitution/CODING_RULES.md` — code quality
9. `constitution/ARCHITECTURE_RULES.md` — architecture preservation

### Before RESPONDING

10. `constitution/VALIDATION_CHECKLIST.md` — 10 items must pass

### When CONFUSED

11. `knowledge/GLOSSARY.md` — term definitions
12. `knowledge/DIRECTORY_GUIDE.md` — where to find files
13. `knowledge/PIPELINE.md` — stage details
14. `state/CHANGELOG_AI.md` — what changed and why

### When considering CHANGE

15. `state/ARCHITECTURE_DECISIONS.md` — WHY current architecture exists
16. `state/ROADMAP.md` — is this feature approved?
17. `state/OPEN_QUESTIONS.md` — is this an open decision?
18. `state/TECH_DEBT.md` — is this known debt?
19. `knowledge/KNOWN_LIMITATIONS.md` — is this a known limitation?

### When STRUCTURING a prompt

20. `workflow/PROMPTING_GUIDE.md` — mandatory order

### When IMPLEMENTING

21. `workflow/templates/` — use the matching template

## File count

| Directory | Files | Purpose |
|---|---|---|
| `constitution/` | 6 | Static rules |
| `knowledge/` | 9 | Stable project knowledge |
| `workflow/` | 2 + 5 templates | Process and templates |
| `state/` | 6 | Project state (changes frequently) |
| `context/` | 1 | High-density facts |
| **Total** | **29 files** | **~2400 lines** |

## Reasoning effort policy

| Task type | `reasoning_effort` |
|---|---|
| Architecture, refactoring, domain modeling, pipelines, AI, databases, distributed systems | `max` |
| Simple edits, formatting, dependency bumps | `high` |

## Anti-hallucination policy

Never respond using presumed knowledge when project context is available. Search the codebase first. Only after exhausting available context may you ask the user. Never fill gaps by inventing code, APIs, classes, interfaces, endpoints, migrations, events, schemas, dependencies, libraries, or configurations.

## Negative constraints (permanent)

Never:
- invent APIs, classes, interfaces, endpoints, migrations, events, schemas, dependencies, libraries, configurations
- assume behavior not observed in code
- alter public contracts without explicit request
- modify architecture without justification
- replace functional code by preference
- fix known limitations without explicit request
- re-discuss settled decisions (check `state/ACTIVE_DECISIONS.md`)
- propose features outside `state/ROADMAP.md`
- resolve open questions silently (check `state/OPEN_QUESTIONS.md`)
