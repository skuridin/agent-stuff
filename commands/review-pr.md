---
description: Review GitHub PR with expert-level analysis
---
Review PR $ARGUMENTS with expert-level analysis.

## Workflow

### 1. Setup
- Checkout the PR: `gh pr checkout $ARGUMENTS`
- Get PR metadata: `gh pr view $ARGUMENTS`
- Get changed file list: `gh pr diff $ARGUMENTS --name-only`
- Get the full diff: `gh pr diff $ARGUMENTS`

### 2. Read Changed Files
Read each changed file to understand the full context, not just the diff hunks.

### 3. Analyze from Multiple Perspectives

Review the changes considering these expert viewpoints:

**Security Engineer**
- Auth/authorization bypasses
- Injection vulnerabilities (XSS, SQL injection)
- Data exposure, CSRF, secrets

**Accessibility Specialist** (for UI changes)
- ARIA attributes and roles
- Keyboard navigation
- Focus management

**Software Architect**
- Design patterns and consistency
- Separation of concerns
- API surface changes

**QA Engineer**
- Edge cases and error handling
- Race conditions
- Test coverage gaps

**KISS Advocate**
- Over-engineering
- Unnecessary abstractions
- Could this be simpler?

### 4. Classify Findings

For each issue found, determine:
- **Priority**: Fix | Consider | Cleanup
- **Confidence**: Confirmed (verified reachable) | Theoretical (might not be reachable)

To determine confidence, check:
- Are there guards that prevent this code path?
- Is this actually exercised in production usage?
- What conditions must be true for this to occur?

### 5. Present Summary Table

| # | Priority | Confidence | Category | Issue | File |
|---|----------|------------|----------|-------|------|
| 1 | Fix | Confirmed | Security | ... | ... |

**Legend:**
- **Fix (Confirmed)** - Verified bug with reproduction path, must fix
- **Fix (Theoretical)** - Possible bug, verify before fixing
- **Consider (Confirmed)** - Real concern, evaluate tradeoffs
- **Consider (Theoretical)** - Possible concern, context-dependent
- **Cleanup** - Style/quality improvement (no confidence needed)

Also note any dismissed concerns briefly so the reviewer knows they were considered.

Include positive feedback on what the PR does well.

### 6. Interactive Walkthrough
After the summary, wait for me to say "next" to walk through issues one-by-one.

For each issue:
- Show "Issue X of Y"
- Explain the problem with code snippets
- Note confidence level and why
- Propose a solution
- Suggest a PR comment I can copy

## Focus Areas

- Security vulnerabilities
- Accessibility compliance
- Breaking changes
- Browser compatibility
- Code consistency
- Simplicity over cleverness
- Practical impact over theoretical concerns
