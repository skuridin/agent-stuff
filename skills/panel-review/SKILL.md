---
name: panel-review
description: Use this skill when reviewing code, PRs, files, or directories as an expert panel; supports interactive walkthroughs and opt-in draft GitHub reviews for multiple PRs.
---

# Panel Review Skill

Review code through a set of expert lenses.

## Target resolution

| Input | Action |
|---|---|
| No args / `"pr"` | Review current branch's PR (`gh pr view`, `gh pr checkout`, `gh pr diff`) |
| PR number or URL | Checkout with `gh pr checkout`, review that PR |
| Multiple PRs + `"draft review"` | Batch draft review mode (see below) |
| Multiple PRs without `"draft review"` | Ask: interactive single-PR review, or rerun with `draft review`? |
| File path / component name | Read file + related files (tests, types, parents), review holistically |
| Directory / glob | Review all matching files |

**Git safety preflight:** Before any `gh pr checkout`, run `git status --porcelain`. If dirty, ask the user (continue / stash / abort). Never switch branches on a dirty tree without confirmation.

**PR reviews:** Read full source files for context, not just diffs. Identify changed/replaced/newly exported symbols and inspect related wrappers, adapters, helper types, contexts, and barrel exports.

**PR review workflow:** Read metadata + diff → identify changed symbols → search for usages (removed symbols, wrappers, stale helpers, barrel exports) → read full source files → review shared exports against arbitrary consumers → verify escaping in dynamically constructed strings → deduplicate + rank findings.

## Review lenses

Run these lenses for every review target. Only report findings when there's something meaningful to say.

1. **CI/CD** — workflow correctness, triggers, caching
2. **Security** — supply chain, injection, runtime hardening
3. **DevOps/SRE** — operational concerns, monitoring, reliability
4. **Frontend** — build correctness, framework-specific issues
5. **Simplicity (KISS)** — identify complexity removable without losing capability. Ask whether each abstraction buys real branching, reuse, or consistency, or is just static indirection
6. **Code Quality** — correctness bugs, edge cases, error handling
7. **Monorepo/Platform** — repo structure, consistency, cross-package concerns
8. **Semantic Markup & Accessibility** — rendered markup semantics, redundant wrappers, duplicated styling, keyboard/focus visibility, interaction affordances
9. **Usage & Reachability** — search for consumers of changed/removed/replaced symbols; flag dead wrappers, stale helpers, orphaned types, unused barrel exports
10. **Refactor Cleanup** — compare old vs new abstraction; identify now-unnecessary compatibility layers and support code
11. **Dynamic Construction Safety** — verify escaping/encoding/validation for interpolated values in selectors, regexes, URLs, paths, commands
12. **Shared Surface Hardening** — review exported/shared components against arbitrary consumer input, not just current local call sites

## Batch draft PR review mode

Only when: user supplies multiple PRs **and** the request contains `"draft review"`. All PRs must belong to the current repo.

Rules:
- **Sequential only** — review PRs one at a time via `gh pr checkout`
- **Clean tree required** — if `git status --porcelain` is non-empty, stop and ask user to clean/stash
- **Preserve user's PR order**
- **Leave worktree on last PR** — mention in summary
- **Continue on failure** — if one PR fails (checkout, permissions, API), proceed to next and report failure
- **Skip interactive walkthrough** — this mode is write-only
- **Deduplicate findings**, include all severities including Nitpick

For each PR with findings, create a **pending/draft** review via GitHub API:

```bash
gh api -X POST "repos/<owner>/<repo>/pulls/<number>/reviews" --input /tmp/panel-review-<number>.json
```

Payload shape:
```json
{
  "commit_id": "<pr-head-sha>",
  "body": "Non-inline findings and summary, if any.",
  "comments": [
    { "path": "src/file.ts", "line": 42, "side": "RIGHT", "body": "Medium / Confirmed: Problem and smallest safe fix." }
  ]
}
```

- Omit `event` field to keep review pending. **Never** use `gh pr review --comment/--approve/--request-changes` — those publish.
- Map findings to inline comments on valid diff lines. If GitHub rejects a line, move finding to body.
- No findings → skip draft review, report locally as clean.

Output: concise per-PR summary — PR id/title, success/failure, finding counts by severity, inline comment count, whether pending draft was created.

## Severity & confidence

| Severity | Meaning |
|---|---|
| **Critical** | Imminent production outage, data loss, or exploitable security risk |
| **High** | Major functional breakage or high-impact reliability/security issue |
| **Medium** | Correctness/reliability issues affecting a subset of flows or edge cases |
| **Low** | Maintainability or minor correctness concerns with limited runtime impact |
| **Nitpick** | Stylistic/readability improvements, no behavioral effect |

| Confidence | Rules |
|---|---|
| **Confirmed** | Bug exists in current code path, or repo has a reachable caller that triggers it |
| **Theoretical** | Depends on uncommon input, future consumers, or assumptions not exercised by current usage |

For Theoretical issues: include explicit preconditions, why guards may be insufficient, and a validation step to confirm/falsify. If you can't describe plausible preconditions, don't include it.

## Output format

List issues most-important first. Deduplicate overlapping findings from multiple lenses into one canonical issue. Don't pad with harmless observations.

For each issue:

- **Severity** (Critical / High / Medium / Low / Nitpick)
- **Confidence** (Confirmed / Theoretical)
- **Which lens(es)** flagged it
- Brief description of the problem
- **Evidence** (exact code pattern, snippet, or line-level behavior)
- **Why it matters** (correctness, semantics, reliability, security, maintainability, accessibility)
- **Suggested fix** (smallest safe change)

## Interactive walkthrough

Skip in batch mode.

After presenting the full issue list, walk through issues one by one. For each: explain the issue with context, state confidence + justification, propose a concrete fix, and draft a plain-text GitHub PR comment (no code blocks, no `>` quote syntax). State the target file and line number separately.

Use the questionnaire/question tool if available to present each issue and collect the user's command. If no question tool is available, wait for a text response.

Supports commands: **fix** (apply + stage, don't commit), **next**, **details**, **recheck**, **stop**.
