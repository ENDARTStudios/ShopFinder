# Decision Policy — Priority Hierarchy

> Every decision must follow this hierarchy. When in conflict, higher priority wins.

## Priority order (highest to lowest)

```
1. Correctness
2. Security
3. Simplicity
4. Maintainability
5. Scalability
6. Performance
7. Cost
```

## Conflict resolution

When two priorities conflict:

```
Correctness > Security > Simplicity > Performance
```

### Examples

| Decision | Correct? | Secure? | Simple? | Fast? | Choose |
|---|---|---|---|---|---|
| Inline SQL vs Prisma | Both correct | Prisma (parametrized) | Inline is simpler | Inline is faster | **Prisma** (Security > Simplicity > Performance) |
| Cache vs no cache | Both correct | Both secure | No cache is simpler | Cache is faster | **No cache** (Simplicity > Performance, unless performance is a measured problem) |
| New abstraction vs inline | Both correct | Both secure | Inline is simpler | Same | **Inline** (Simplicity wins, abstraction only when 2+ implementations exist) |
| BrandedId vs string | Both correct | BrandedId (compile-time safety) | String is simpler | Same | **BrandedId** (Correctness > Simplicity, because branded IDs prevent bugs) |

## Decision principles

### 1. Correctness always wins

If code is fast but wrong, it is worthless. If code is simple but wrong, it is worthless. Correctness is non-negotiable.

- Data must be accurate
- Types must be correct
- Logic must match the domain model
- Artifacts must be immutable
- Events must be emitted in the correct order

### 2. Security is second

- Never store secrets in code
- Never trust user input without validation
- Never expose internal errors to API callers
- Always use parameterized queries (Prisma does this)
- Always validate at trust boundaries

### 3. Simplicity over cleverness

- A 10-line function that works is better than a 5-line function that is clever
- A flat module is better than a deeply nested one
- An explicit if/else is better than a ternary chain
- A for loop is better than a reduce when the intent is iteration

### 4. Maintainability over scalability

- Code that is easy to read is easy to change
- Code that is easy to test is easy to trust
- Code that follows patterns is easy to extend
- Do not optimize for scale that does not exist yet

### 5. Scalability over performance

- Horizontal scalability (stateless, event-driven) is preferred over vertical optimization
- The pipeline is designed for async processing (BullMQ) — use it
- Do not premature-optimize hot paths without benchmarks

### 6. Performance is measured, not guessed

- Never optimize without a benchmark
- Never add caching without measuring cache hit rates
- Never add indexing without measuring query times
- "I think this is slow" is not a valid reason to optimize

### 7. Cost is last

- Developer time is more expensive than compute time
- Clarity is more valuable than micro-optimizations
- Infrastructure cost should be monitored, not preemptively minimized

## When to ask the user

When a decision has significant trade-offs that affect multiple priorities, present the options with their trade-offs and let the user decide. Do not silently choose.

Example:
> "Option A is simpler but breaks backward compatibility. Option B preserves compatibility but adds complexity. Which do you prefer?"
