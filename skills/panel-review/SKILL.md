---
name: panel-review
description: Review code as a panel of experts with interactive walkthrough for PRs or files.
---

# Panel Review Skill

Review code as a panel of experts including a KISS advocate.

## How to use

Use this skill when the user asks for a "panel review" or a "code review" for a PR, file, or directory.

Look at the provided arguments to decide what to review:

- **No arguments or "pr"** — review the current branch's PR. Use `gh pr view` to find it, then checkout the PR branch with `gh pr checkout` and use `gh pr diff` for changes.
- **PR number (e.g. `123`) or URL (e.g. `github.com/.../pull/123`)** — review that specific PR. Checkout the PR branch with `gh pr checkout <number>`, then use `gh pr view <number>` and `gh pr diff <number>`.
- **File path or component name (e.g. `src/components/Button.tsx`)** — review that file or find it via glob. Read the file and all closely related files (tests, types, parent components) to build context.
- **Directory or glob (e.g. `apps/frontend/deploy/`)** — review all files matching the pattern.

For PR reviews, run a git safety preflight before any `gh pr checkout`:

1. Run `git status --porcelain`.
2. If there are uncommitted changes, pause and ask the user how to proceed (`continue`, `stash`, or `abort`).
3. Do not switch branches on a dirty working tree without explicit user confirmation.

Then checkout the PR branch with `gh pr checkout` so you can read the full source files for context — not just the diff. Focus on changed lines but read surrounding code and related files to flag issues in context. For file/component reviews, read the full file and review holistically.

For PR reviews, do not stop at the edited lines. Always identify changed, replaced, and newly exported symbols, then inspect related wrappers, adapters, helper types, contexts, and barrel exports for cleanup opportunities.

## PR review workflow

For pull requests, follow this workflow before finalizing findings:

1. Read the PR metadata and full diff.
2. Identify symbols that were added, removed, renamed, or replaced.
3. Run repo-wide usage searches for:
   - removed or replaced symbols
   - wrappers/adapters around those symbols
   - helper types, contexts, and utilities that only existed to support the old abstraction
   - barrel exports for touched modules
4. Read the full source files for the changed code and any nearby related files.
5. If a changed module is exported from a shared package, review it against arbitrary valid consumer input - not only the current in-repo call sites.
6. If the PR builds selectors, regexes, URLs, paths, commands, or other structured strings from variables, verify escaping/encoding/validation.
7. Only then deduplicate findings and rank them by severity.

## Expert panel

1. **CI/CD Engineer** — workflow correctness, triggers, caching
2. **Security Engineer** — supply chain, injection, runtime hardening
3. **DevOps/SRE** — operational concerns, monitoring, reliability
4. **Frontend Engineer** — build correctness, framework-specific issues
5. **KISS Advocate** — unnecessary complexity, over-engineering
6. **Code Quality Engineer** — correctness bugs, edge cases, error handling
7. **Monorepo/Platform Engineer** — repo structure, consistency, cross-package concerns
8. **Semantic/UI Markup Engineer** — rendered markup semantics, redundant wrappers, duplicated styling layers, and accessibility implications

Not every expert needs to speak. Only include reviewers who have something meaningful to say about the target code.

## Mandatory review passes

Always run these passes for every review target, even if no issue is found:

1. **Semantic structure pass** — verify rendered markup is semantically appropriate for context.
2. **Redundancy pass** — detect duplicate wrappers, repeated styling logic, and unnecessary abstraction layers.
3. **Accessibility interaction pass** — verify keyboard/focus visibility and interaction affordances are preserved.
4. **Simplicity pass (KISS)** — identify complexity that can be removed without reducing clarity or capability. Explicitly ask whether each abstraction/runtime helper buys real branching, reuse, or consistency, or is only static indirection.
5. **Usage/reachability pass** — search for consumers of changed, removed, or replaced symbols; flag dead wrappers, stale helpers, orphaned types, and unused barrel exports introduced by the refactor.
6. **Refactor cleanup pass** — compare the old abstraction to the new one and ask what compatibility layers or support code are now unnecessary.
7. **Dynamic construction safety pass** — inspect interpolated values passed into selectors, regexes, URLs, paths, commands, or other structured syntaxes; verify escaping, encoding, or validation is appropriate.
8. **Shared surface hardening pass** — for exported/shared components and utilities, review against arbitrary valid consumer input and edge cases, not just today's local usage.

## Severity rubric (use consistently)

- **Critical** — imminent production outage, data loss/corruption, or clear exploitable security risk.
  - Example: unbounded public endpoint enabling unauthorized data access.
- **High** — major functional breakage or high-impact reliability/security issue without immediate catastrophic blast radius.
  - Example: deployment config that consistently breaks one environment.
- **Medium** — correctness/reliability issues that affect a subset of flows or edge cases with meaningful user impact.
  - Example: missing null guard causing runtime errors in a specific interaction path.
- **Low** — maintainability, observability, or minor correctness concerns with limited immediate runtime impact.
  - Example: duplicated logic likely to drift and introduce future defects.
- **Nitpick** — stylistic or readability improvements that do not materially affect behavior.
  - Example: naming/formatting suggestion.

## Output format

List all issues and suggestions from most important to least.

Before finalizing the list, deduplicate overlapping findings from multiple reviewers into one canonical issue (merge reviewer attributions and keep the strongest evidence).

Do not pad the review with harmless consistency-only observations. Report stylistic inconsistencies only when they create invalid markup, accessibility/correctness risk, duplicated responsibilities likely to drift, or meaningful maintenance burden.

For each issue include:

- **Severity** (Critical / High / Medium / Low / Nitpick)
- **Confidence** (Confirmed / Theoretical) — see below
- **Which reviewer(s)** flagged it
- Brief description of the problem
- **Evidence** (exact code pattern, snippet, or line-level behavior)
- **Why it matters** (correctness, semantics, reliability, security, maintainability, or accessibility)
- Suggested fix (prefer the smallest safe change)

## Confidence scoring

For each issue, determine its confidence level:

**Confirmed** — Verified bug with clear reproduction path or direct evidence
**Theoretical** — Possible bug based on static analysis, may not be reachable

To determine confidence, check:
- Are there guards that prevent this code path?
- Is this actually exercised in production usage?
- What conditions must be true for this to occur?
- Does the issue happen with today's observed call sites, or only with future/alternate consumers of a shared API?

Use these rules consistently:
- **Confirmed** — the bug exists in the current code path or rendered structure, or the repo already contains a reachable caller that triggers it.
- **Theoretical** — the issue depends on uncommon input, future consumers, alternate callers, or assumptions that are not exercised by the current in-repo usage.
- If a shared/exported component is under-hardened but current callers only pass safe values, prefer **Theoretical** unless you can show a present caller that triggers the bug.

Prioritize confirmed issues. Theoretical issues should still be flagged but clearly labeled.

For every **Theoretical** issue, you must include:
- Explicit preconditions ("This can happen if...")
- Why existing guards may be insufficient or bypassed
- A fast validation step (test/log/repro hint) to confirm or falsify it

If you cannot describe plausible preconditions, do not include it as a reported issue.

## Missed-issue retro loop

If the user points out a missed issue:

1. Acknowledge it and classify it with severity/confidence/reviewer.
2. Add a new **generic detection heuristic** to your active checklist for the rest of the session.
3. Phrase new heuristics as tool/framework-agnostic patterns (no project-specific rules).

Example heuristic format: "Check for nested wrapper components that duplicate semantics or styling responsibilities."

Useful generic heuristics to add after misses:
- "After replacing an abstraction, search for orphaned wrappers, adapters, contexts, helper types, and barrel exports that no longer have consumers."
- "When code interpolates values into a structured syntax (selector, regex, URL, path, command), verify the value is escaped, encoded, or validated before use."
- "For shared/exported APIs, evaluate robustness against plausible external inputs even if current local call sites are narrow and safe."
- "Ask whether a styling or utility abstraction has any real variants/branching; if not, consider whether a static constant would be simpler."

## Interactive walkthrough

After presenting the full list, walk through issues one by one. For each issue:

1. State the issue number and total (e.g. "Issue 3 of 12") — **always start from issue 1; never skip the first issue**
2. **Explain** the issue — describe what's wrong and why, with enough context that the user can evaluate it
3. State the **confidence level** (Confirmed / Theoretical) with a brief justification
4. **Propose a solution** — show a concrete diff or code change
5. **Propose a PR comment** — draft a GitHub PR inline review comment. Format as plain text — **never wrap in a code block or use markdown quote block syntax (`>`)**. State the target file and line number (e.g. `useTemplateSettings.ts:32`) so the user knows where to place it in the GitHub review UI. Do not include the file path in the comment body itself. Keep it concise and actionable.
6. Wait for an interactive command before moving on

Supported interactive commands:
- **fix** — apply the proposed fix, then stage the change.
- **next** — move to the next issue without applying a fix.
- **details** — provide deeper explanation, trade-offs, and edge cases for the current issue.
- **recheck** — re-evaluate the current issue after new context or edits.
- **stop** — end the walkthrough immediately.

When fixing an issue, apply the change and stage it. Do not commit — the user will handle commits separately.

## HTML report (optional)

Generate an HTML report only when the user explicitly requests it (e.g. "generate html", "html report", "save as html", `--html` flag in arguments).

When requested:

1. Build a JSON data object following this schema and write it to a temp file:
```json
{
  "target": { "label": "PR #123", "url": "https://...", "title": "feat: ..." },
  "issues": [
    {
      "title": "Issue title (inline `code` ok)",
      "severity": "critical|high|medium|low|nitpick",
      "confidence": "confirmed|theoretical",
      "reviewers": "Frontend, A11y",
      "sections": [
        { "label": "Problem", "md": "Description with `code` and **bold**" },
        { "label": "Why it matters", "md": "..." },
        { "label": "Suggested fix", "md": "..." }
      ],
      "code": "// optional code block\n<TextField>...",
      "file": "src/components/Button.tsx",
      "line": 42,
      "comment": "Plain text PR comment for copy button"
    }
  ]
}
```
2. Write the JSON to a temp file and run the generator script:
```bash
cat > /tmp/panel-review-data.json << 'REVIEW_JSON'
{ ... your JSON ... }
REVIEW_JSON
~/.claude/skills/panel-review/generate-report.sh /tmp/panel-review-data.json <identifier>
```
   Use PR number, file name, or a short slug as the identifier.
3. Tell the user: `open /tmp/panel-review-<identifier>.html`

**IMPORTANT**: Do NOT read the template HTML file. The script handles template injection.

The `md` fields support mini-markdown (rendered by the template's JS):
- `` `code` `` → inline code
- `**bold**` → bold text
- `- item` lines → bulleted lists
- Blank lines → paragraph breaks
- ` ```code``` ` → fenced code blocks

The review itself proceeds normally (markdown output + interactive walkthrough). The HTML file is an additional artifact, not a replacement.
