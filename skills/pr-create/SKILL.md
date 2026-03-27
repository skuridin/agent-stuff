---
name: pr-create
description: Create GitHub pull requests with conventional commit titles and clear, non-technical descriptions answering what changed and why. Use when creating PRs, opening pull requests, or publishing changes for review.
---

# PR Create Skill

Use this skill when the user asks to create a pull request, open a PR, or publish changes for review.

## When to use

Trigger phrases: "create a PR", "open a PR", "make a pull request", "publish changes", "submit for review".

## Gathering context

Before generating the PR, gather two things:

```bash
# Commit history on the branch
git log origin/main..HEAD --oneline

# Actual changes (use the merge-base for clean diff)
git diff origin/main...HEAD --stat
git diff origin/main...HEAD
```

Use both the commit log and the diff to understand:
- What was actually changed (the diff)
- The developer's stated intent (the commits)

If the diff is very large (>500 lines), focus on the `--stat` summary and read key changed files directly rather than parsing the full diff.

## Title rules

Format: `type(scope): description`

### Conventional commit types

| Type | When to use |
|------|-------------|
| `feat` | New user-facing functionality |
| `fix` | Bug fix |
| `refactor` | Code restructuring without behavior change |
| `perf` | Performance improvement |
| `test` | Adding or updating tests |
| `docs` | Documentation only |
| `chore` | Maintenance, dependencies, tooling |
| `ci` | CI/CD pipeline changes |
| `build` | Build system or external dependencies |
| `style` | Formatting, whitespace, no logic change |

### Choosing the type

- Infer from the **actual changes**, not from commit messages (commits may be inconsistent)
- If the PR contains multiple types, pick the most impactful one
- `feat` > `fix` > `refactor` > `perf` > the rest

### Scope

- Optional, wrap in parentheses
- Derive from the most affected area: `auth`, `api`, `ui`, `db`, `config`, etc.
- Keep it short — one or two words max

### Description

- Lowercase, imperative mood ("add", "fix", "remove", not "added", "fixes", "removing")
- No period at the end
- Concise — under 72 characters total if possible

## Description rules

The PR description must answer two questions:

1. **What** changed — in plain language
2. **Why** it matters — the reason or motivation

### Writing for a non-technical audience

- Use plain language, avoid jargon
- No code snippets, file paths, or technical identifiers
- Focus on behavior and outcomes, not implementation details
- Use bullet points or short paragraphs

### What NOT to include

These are already visible in the GitHub UI:

- List of files modified (GitHub shows this)
- Line counts ("+200 -50")
- Code diffs
- Branch name
- Mechanical "added X, removed Y" — describe the intent instead
- References to plans, phases, or slices that cannot be linked — if the plan exists only locally, skip it. The PR should stand on its own as a self-contained piece of work

### Format

```markdown
## What

- [Bullet points describing what changed in plain language]

## Why

- [Bullet points explaining the motivation or problem being solved]
```

If the PR is simple (single focused change), a single paragraph is fine — don't force a section breakdown.

## Code review tips

When the PR has meaningful scope (not a one-line fix), append a **What to focus on when reviewing** section. Keep it short — 3-5 tips max, relevant to the actual changes.

### Tip selection guidelines

- **Skip mechanical changes** — files that were only moved, renamed, or re-exported are low-risk and don't need deep review
- **Focus on logic changes** — new conditionals, state mutations, API calls, error handling, data transformations
- **Highlight boundary changes** — error handling paths, input validation, authorization checks, schema changes, public API surface
- **Flag test changes** — tests reveal intent and coverage; changes here show what the author thinks is important
- **Call out deletions** — removed code can break downstream consumers or leave orphaned references
- **Note renamed/moved files** — these are often safe but can break imports; mention the volume so reviewers know to spot-check a few rather than all

### When to skip review tips entirely

- One-line or trivial changes
- Pure dependency updates
- Generated files (lockfiles, build output)
- Documentation-only changes

### Format

```markdown
## What to focus on when reviewing

- [Relevant tip based on actual changes]
- [Another relevant tip]
```

## PR creation

After the title and description are ready, create the PR:

```bash
gh pr create --title "type(scope): description" --body "$(cat <<'EOF'
[description content]
EOF
)"
```

If a PR already exists on this branch, suggest updating the existing one instead.

## Examples

### Good title

```
feat(auth): add support for SSO login
```

### Bad titles

```
update auth           # no type
Feat: Added SSO       # wrong case, past tense
feat(auth) add sso    # missing colon
```

### Good description

```markdown
## What

- Added single sign-on (SSO) support using SAML 2.0
- Users can now log in with their company credentials instead of creating a separate account

## Why

- Enterprise customers require SSO to meet their security policies
- Reduces friction during onboarding — no extra password to manage

## What to focus on when reviewing

- SAML response parsing and signature validation — this is security-critical
- New `POST /auth/sso/callback` endpoint handles untrusted external input
- Existing email/password login should still work (no regression)
```

### Bad description

```markdown
- Modified src/auth/saml.go
- Added new callback handler
- Updated 15 files across auth package
- +342 -12 lines
```
