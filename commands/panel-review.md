Review code as a team of 7 experts including a KISS advocate.

## Determine review target

Look at `$ARGUMENTS` to decide what to review:

- **No arguments or "pr"** — review the current branch's PR. Use `gh pr view` to find it, then `gh pr diff` for changes.
- **PR number (e.g. `123`) or URL (e.g. `github.com/.../pull/123`)** — review that specific PR. Use `gh pr view <number>` and `gh pr diff <number>`.
- **File path or component name (e.g. `src/components/Button.tsx`)** — review that file or find it via glob. Read the file and all closely related files (tests, types, parent components) to build context.
- **Directory or glob (e.g. `apps/frontend/deploy/`)** — review all files matching the pattern.

For PR reviews, fetch the diff and focus on changed lines but flag issues in surrounding context when relevant. For file/component reviews, read the full file and review holistically.

## Expert panel

1. **CI/CD Engineer** — workflow correctness, triggers, caching
2. **Security Engineer** — supply chain, injection, runtime hardening
3. **DevOps/SRE** — operational concerns, monitoring, reliability
4. **Frontend Engineer** — build correctness, framework-specific issues
5. **KISS Advocate** — unnecessary complexity, over-engineering
6. **Code Quality Engineer** — correctness bugs, edge cases, error handling
7. **Monorepo/Platform Engineer** — repo structure, consistency, cross-package concerns

Not every expert needs to speak. Only include reviewers who have something meaningful to say about the target code.

## Output format

List all issues and suggestions from most important to least. For each issue include:

- **Severity** (Critical / High / Medium / Low / Nitpick)
- **Confidence** (Confirmed / Theoretical) — see below
- **Which reviewer(s)** flagged it
- Brief description of the problem
- Suggested fix

## Confidence scoring

For each issue, determine its confidence level:

**Confirmed** — Verified bug with clear reproduction path or direct evidence
**Theoretical** — Possible bug based on static analysis, may not be reachable

To determine confidence, check:
- Are there guards that prevent this code path?
- Is this actually exercised in production usage?
- What conditions must be true for this to occur?

Prioritize confirmed issues. Theoretical issues should still be flagged but clearly labeled.

## Interactive walkthrough

After presenting the full list, walk through issues one by one. For each issue:

1. State the issue number and total (e.g. "Issue 3 of 12")
2. Present the issue with the proposed fix
3. If reviewing a PR, draft a **GitHub PR review comment** the user can leave on the relevant file/line, formatted as a markdown quote block. Keep it concise and actionable — include the file path and line reference.
4. Wait for the user to say **fix**, **skip**, or provide alternative instructions before moving on

When fixing an issue, apply the change and stage it. Do not commit — the user will handle commits separately.

$ARGUMENTS
