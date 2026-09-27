---
name: address-review
description: Handle review comments on my own pull request. Checks out the PR, fetches unresolved review threads, verifies each claim against the code, recommends fix / reply / follow-up issue, then fixes and replies on GitHub once I decide. Use when asked to "fetch review comments and verify them", "address review", "respond to review comments", "check the review on my PR", or given a PR URL with a #pullrequestreview anchor.
---

# Address Review

For PRs I authored. Reviewing someone else's PR is a different job (pr-review-bot / thermo-nuclear-pr-review).

## 1. Get on the branch

- Target: PR number or URL from the prompt, else the PR for the current branch.
- Not on it yet: `gh pr checkout <n>`. Dirty tree: stop and ask.
- Force-pushed remote: `git fetch` and `git reset --hard origin/<branch>` only after confirming no local commits would be lost.

## 2. Fetch threads

Run `scripts/pr-threads [n|url]` (relative to this skill's directory). Add `--all` to include resolved threads.

Each thread prints `thread <node-id> reply-to <comment-id>`, the file:line, and the conversation. Skip threads where I already replied and the reviewer has not answered.

## 3. Verify each claim

- Read the actual code at the cited location and trace the real flow. Do not trust the reviewer's description of the code.
- If the claim depends on another system (backend, API contract), say so and offer to check that codebase instead of guessing.
- More than two non-trivial claims: verify with an independent read-only subagent, give it the thread text and the files, ask for `REAL|NOT REAL|PARTLY` plus one line of evidence each.

Report per thread, short:

```
1. <file:line> <claim in plain words>
   verdict: real / not real / partly — <evidence>
   do: fix in this PR / reply only / follow-up issue — <why>
```

"Follow-up issue" when the claim is real but outside this PR's scope. Then stop and wait for my decision. Do not edit or post yet.

## 4. Act on my decision

- Fix: smallest change that addresses the root cause, then run the repo's verify command. Commit with the repo's commit convention.
- Push only when I say so.
- Reply only after the fix is pushed, so replies reference committed code (short SHA, file names).
- Follow-up issue: create it with `gh issue create`, What + Why sections, framed as something to investigate if no decision was made. Link it in the reply.

## 5. Reply on GitHub

```sh
gh api repos/{owner}/{repo}/pulls/<n>/comments/<reply-to>/replies -f body='...'
```

- 1-3 sentences, casual peer tone, lowercase fine, plain words. Must not read as AI-written: no "great catch!", no bullet lists, no headings.
- Say what was done and where (`fixed in abc1234, ...`), or why it stays as is with the evidence.
- No bot footer: these go out in my voice, so draft them and show me before posting unless I already said "reply".
- Do not resolve threads; the reviewer does that.
- A POST can error after it succeeded. Re-run `pr-threads` to check before posting again.
