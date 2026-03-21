---
name: repo-explore
description: Clones a git repo to /tmp for code exploration. Use when the user provides a repo URL and needs implementation details, source patterns, or context not available in web docs. Supports optional branch/tag.
allowed-tools: Bash(git:*), Bash(find:*), Bash(rg:*), Bash(rm:*), Bash(ls:*), Bash(tree:*), Bash(wc:*), Bash(head:*), Bash(tail:*), Bash(stat:*), Bash(mkdir:*), Bash(mktemp:*)
---

# Repo Exploration

## Workflow

1. **Clone** the repo to a temp directory
2. **Explore** the codebase to gather context
3. **Report** findings to the user
4. **Cleanup** the temp directory

## Clone

```bash
# Shallow clone to /tmp (default branch)
git clone --depth 1 <repo_url> /tmp/repo-explore-<basename>

# Shallow clone with specific branch or tag
git clone --depth 1 --branch <tag_or_branch> <repo_url> /tmp/repo-explore-<basename>
```

Always use `--depth 1` to avoid pulling full history. Extract the repo basename from the URL (e.g., `https://github.com/user/awesome-lib` → `awesome-lib`).

## Explore

Use standard CLI tools to navigate the codebase:

```bash
# Overview of top-level structure
tree -L 2 -I 'node_modules|.git|vendor|__pycache__|dist|build' /tmp/repo-explore-<basename>

# Search for patterns across the codebase
rg "<pattern>" /tmp/repo-explore-<basename> --glob '!node_modules' --glob '!.git'

# Find specific file types
find /tmp/repo-explore-<basename> -name "*.md" -not -path "*/.git/*"

# Read key files: README, CHANGELOG, setup files
ls /tmp/repo-explore-<basename>/
```

Prefer `rg` over `grep` and `find` for search. Use `--glob` to exclude noise (node_modules, .git, dist, build).

## Cleanup

**Always clean up after the task is complete.** This is not optional.

```bash
rm -rf /tmp/repo-explore-<basename>
```

The user expects the temp directory to be removed when you are done. If the user asks a follow-up question that requires re-exploring, clone again.

## Examples

### Exploring a library's API surface

```bash
# Clone
git clone --depth 1 https://github.com/user/cool-sdk /tmp/repo-explore-cool-sdk

# Find public API exports
rg "export" /tmp/repo-explore-cool-sdk/src --glob '!*.test.*'

# Read the main entry point
ls /tmp/repo-explore-cool-sdk/src/

# Cleanup
rm -rf /tmp/repo-explore-cool-sdk
```

### Finding how a feature is implemented

```bash
# Clone specific version
git clone --depth 1 --branch v3.2.1 https://github.com/user/framework /tmp/repo-explore-framework

# Search for the feature
rg "middleware" /tmp/repo-explore-framework --type py -l

# Read the relevant files
rg -n "def middleware" /tmp/repo-explore-framework/src/

# Cleanup
rm -rf /tmp/repo-explore-framework
```
