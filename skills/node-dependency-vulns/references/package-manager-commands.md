# Package Manager Command Reference

Read this file only after you have detected the project's package manager.

## Detection order

Use this order of trust:

1. Root `package.json` `packageManager`
2. Root lockfile or workspace marker
3. Ask the user if the repo is still ambiguous

If multiple lockfiles exist, do not guess based on whichever CLI happens to be installed. Prefer the lockfile and `packageManager` that match the active workspace root.

If the detected manager is not npm, pnpm, or Yarn, use that manager's native audit, dependency-tree, and update commands only if the repo clearly uses it and the installed CLI supports the workflow. Otherwise, stop and explain that the skill has explicit command guidance only for npm, pnpm, and Yarn.

## npm

### Audit

```bash
npm audit --json
```

### Why is this package here?

```bash
npm ls <package>
```

### Preferred fixes

```bash
npm audit fix
npm install <package>@<patched-version>
npm update <package>
npm dedupe
```

### Last resort

Use `package.json` `overrides` only after exhausting normal upgrade paths.

### Avoid

```bash
npm audit fix --force
```

Use `--force` only when the user accepts breaking changes and you have explained the likely major-version impact.

## pnpm

### Audit

```bash
pnpm audit --json
```

### Why is this package here?

```bash
pnpm why <package>
```

### Preferred fixes

```bash
pnpm up <package>
pnpm up -r <package>
pnpm dedupe
```

Use recursive updates only when the workspace layout calls for them.

For major-version upgrades, use the manager's latest-upgrade path only after telling the user that a breaking change may be required.

### Last resort

Use pnpm overrides only in the workspace root and only as a temporary mitigation.

## Yarn

First identify the Yarn generation:

- **Classic**: `yarn --version` starts with `1.`
- **Berry**: `yarn --version` starts with `2.`, `3.`, or `4.`, or the repo clearly uses `.yarnrc.yml`

### Why is this package here?

```bash
yarn why <package>
```

### Classic audit and fixes

```bash
yarn audit --json
yarn upgrade <package>
yarn upgrade --latest <package>
```

Use `--latest` only after explaining the major-version risk.

### Berry audit and fixes

```bash
yarn npm audit --json
yarn up <package>
yarn up <package>@latest
yarn dedupe
```

Use `@latest` only after explaining the major-version risk.

### Last resort

Use `resolutions` only when normal dependency upgrades cannot remove the vulnerable package yet.

## Fix selection order

Use this order unless the repo has a documented exception:

1. direct dependency patch or minor update
2. parent dependency update that removes the vulnerable transitive package
3. lockfile cleanup or dedupe with the same manager
4. major version bump after telling the user
5. override or resolution as a temporary mitigation

## When no clean fix exists

If there is no patched dependency line available:

- tell the user plainly
- identify whether the issue is direct or transitive
- mention whether a major version bump may help
- avoid pretending the issue is solved with an unsafe or speculative pin
