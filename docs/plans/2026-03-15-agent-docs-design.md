# Agent Docs Design

**Topic:** detailed agent-facing context docs for the Service Tracker repo

## Goal

Create a durable markdown doc set that gives a new agent enough context to:

- understand the repo quickly
- find the correct edit points
- avoid breaking cross-cutting invariants
- distinguish core runtime logic from non-core repo content

## Chosen structure

The approved structure is a layered doc set under `docs/agents/`:

1. `README.md`
2. `architecture-overview.md`
3. `data-model-and-rules.md`
4. `feature-map.md`
5. `change-guide.md`
6. `testing-and-invariants.md`
7. `repo-map.md`

## Why this structure

The repo's complexity is mostly cross-cutting rather than directory-count complexity.

The docs therefore separate:

- system model
- data and permissions
- visible features
- change guidance
- test-backed invariants

That should be more useful to future agents than a single monolithic handbook or a directory-by-directory inventory.

## Scope decisions

Included:

- frontend runtime architecture
- Firebase/Auth/Functions flow
- Firestore collection model
- date/timezone rules
- mutation patterns
- major regression tests
- edit guidance

Explicitly de-emphasized:

- temporary assets in `tmp/`
- static icons in `public/`
- historical planning docs except as secondary context

## Accuracy sources used

The design was based on reading:

- root config and README
- main app shell, components, hooks, and store modules
- Firestore rules
- Cloud Functions
- existing tests across lib/hooks/components/features
