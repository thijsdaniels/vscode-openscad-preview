# Project Guidelines

## Design Philosophy

Prefer **abstract, data-driven systems** over ad-hoc logic. Generic code should operate on structure and contracts, not check for specific cases. When a new feature requires special behavior in a shared system, extend the system's abstractions rather than adding a branch for that feature. The goal is code that can be expanded without being refactored.

Prefer **unambiguous organization**. It must be immediately obvious and indisputable where a piece of code or data belongs. Avoid grouping by arbitrary or subjective categories — when in doubt, use the most granular organization (one concept per file) so there is never room for interpretation.

Pursue the **simplest robust solution**. Less complexity means fewer mistakes and easier comprehension. But simplicity and abstraction are not at odds — a well-chosen abstraction is simpler than the sprawl of special cases it replaces. After forming a plan, iterate until you're confident it's the simplest solution that is still logical, readable, and sustainable.

## Code Quality

- **Fix types at their source.** No `any` or `as unknown` casts. If the types are wrong, correct them where they originate.
- **Extract reusable components proactively.** When introducing new UI patterns (buttons, fields, layouts), create a proper component in `atoms/` from the start — don't inline styles and markup that will inevitably need reuse. If it has its own visual identity, it's a component.

## GitHub Issues

- **Title:** Short, Title Case. Enough to identify the issue, not so much that the issues list becomes hard to parse. No prefixes or issue types in the title — use labels for that.
- **Description:** Free-form, but consider including: a problem statement, desired outcome, value to the end user, desired user experience, a concise implementation suggestion, and architectural considerations.
- **Assignee:** Assign to the repository owner.
- **Labels:** Apply existing labels where applicable.
