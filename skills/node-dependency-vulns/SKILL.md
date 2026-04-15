---
name: node-dependency-vulns
description: Use this skill when the user wants to audit or fix JavaScript or TypeScript dependency vulnerabilities in a project, including npm, pnpm, and Yarn repos or workspaces. It detects the active package manager, runs the correct audit command, prefers real dependency upgrades over forced pins, warns when a major version bump is the clean fix, and uses overrides or resolutions only as a last resort.
---

# Node Dependency Vulnerabilities

Use this skill when the user asks to run an audit, fix `npm audit` findings, clean up vulnerable dependencies, remediate transitive package issues, or decide whether an override or resolution is necessary.

## Default approach

- Detect the package manager before running any install, audit, or update command.
- Stay on the project's existing package manager and lockfile format.
- Prefer clean dependency upgrades over forced pins.
- If a major version bump may be the right fix, tell the user before applying it.
- Treat overrides and resolutions as temporary last-resort mitigations.

## Workflow

### 1. Detect the package manager and workspace root

Use this order of evidence:

1. Read the root `package.json` and check the `packageManager` field.
2. Look for root lockfiles and workspace markers:
   - `pnpm-lock.yaml` or `pnpm-workspace.yaml` → pnpm
   - `package-lock.json` or `npm-shrinkwrap.json` → npm
   - `yarn.lock` or `.yarnrc.yml` → Yarn
   - `bun.lock` or `bun.lockb` → Bun
3. In a monorepo, prefer the workspace root that owns the lockfile.
4. If multiple managers are implied, prefer `packageManager`, then the root lockfile.
5. If it is still ambiguous, stop and ask the user before making changes.

Never switch managers just because a different CLI is installed globally.

### 2. Run the correct audit

After detection, read `references/package-manager-commands.md` and use the manager-specific audit command. If the repo uses a different JavaScript package manager, use its native audit/update flow if the installed version supports it; otherwise explain the limitation instead of guessing.

Capture:

- vulnerable package names
- severity and whether the issue is production or dev-only when the audit reports it
- direct vs transitive status
- the patched version or safe range, if the audit output provides one
- whether the finding has a straightforward non-breaking remediation

If there are no actionable vulnerabilities, report that clearly and stop.

### 3. Find the lowest-risk fix first

For each vulnerable package:

1. Find why it is installed using the manager-specific tree command.
2. Prefer fixing the nearest direct dependency that pulls the vulnerable version into the tree.
3. Apply fixes in this order:
   - package-manager-native safe remediation
   - targeted update of a direct dependency to the first patched compatible version
   - update of the parent dependency that owns the vulnerable transitive dependency
   - lockfile cleanup or dedupe with the same manager
   - major version bump of a direct dependency or framework
   - override or resolution as a temporary last resort

Do not jump straight to overrides when a normal dependency upgrade can solve the issue.

### 4. Major version rule

If a major version bump is likely required, or would materially simplify the fix:

- tell the user explicitly before making that change
- name the package, current version, and likely target major version when you can
- explain that the change may introduce breaking behavior
- only proceed automatically if the user already asked for aggressive or breaking remediation

Never hide a breaking upgrade behind `npm audit fix --force` or similar blanket upgrade commands.

### 5. Apply the fix

Use the detected manager's native workflow.

- **npm**
  - Start with `npm audit fix` for safe remediations.
  - Use targeted `npm install <pkg>@<version>` or manifest edits for direct dependencies.
  - Avoid `npm audit fix --force` unless the user explicitly accepts breaking changes.
- **pnpm**
  - Prefer targeted `pnpm up <pkg>` updates.
  - In workspaces, use recursive updates only when the lockfile and workspace layout call for it.
  - Use latest or major upgrades only after following the major-version rule above.
- **Yarn**
  - Detect whether the repo is Yarn Classic or Yarn Berry, then use the matching audit and update commands.
  - Use compatible updates first.
  - Use latest or major upgrades only after following the major-version rule above.

If the audit tool suggests fixes that are broader than necessary, prefer the narrowest change that removes the vulnerability.

### 6. Overrides and resolutions are last resort only

Use them only when all of the following are true:

- no clean direct-dependency upgrade path is available right now
- the vulnerable package has a known patched version
- the forced version appears compatible with the depending packages
- the user is told this is a temporary mitigation, not the preferred long-term fix

When you use one:

- use the native mechanism for the detected manager
- keep the scope as narrow as possible
- tell the user exactly why it was needed
- recommend removing it once upstream packages catch up

### 7. Validate after changes

After each meaningful remediation attempt:

- reinstall or refresh the lockfile with the same manager
- rerun the same audit command
- confirm the vulnerable version is no longer present in the dependency tree
- run the most relevant available project checks from `package.json` scripts when practical, usually `test`, `lint`, or `build`
- report any remaining vulnerabilities separately instead of claiming complete success

## Gotchas

- Never run `npm install` inside a pnpm or Yarn repo just to see if it helps.
- Do not replace the existing lockfile with one from a different manager.
- In monorepos, start from the workspace root unless the repo clearly documents a package-level workflow.
- If `npm audit` recommends `--force`, treat that as a sign to inspect and discuss major-version upgrades.
- If no patched version exists, say so plainly. Do not disguise an unfixed issue with an override to another vulnerable version.
- Dev-only issues may still be worth fixing, but they should be reported as dev-only so the user understands the risk.

## Supporting files

Read `references/package-manager-commands.md` after detecting the package manager.

## Output format

Use this structure when summarizing the work:

```markdown
## Package manager
- [detected manager and evidence]

## Audit result
- [summary of findings or "no actionable vulnerabilities found"]

## Fixes applied
- [dependency updates made]
- [lockfile changes]
- [override or resolution used, or "none"]

## User awareness
- [major version bump that may help, or "no major bump needed"]
- [remaining risk or follow-up]

## Validation
- [audit rerun result]
- [tests, lint, or build run and outcome]
```
