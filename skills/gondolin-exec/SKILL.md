---
name: gondolin-exec
description: Run commands in an isolated, disposable Linux VM using Gondolin CLI. Use when testing untrusted code, running installations, or needing a clean isolated environment.
compatibility: Requires QEMU and Node.js installed. Works on macOS and Linux.
---

# Gondolin Exec Skill

Use Gondolin to run commands in a disposable Linux micro-VM. The VM is isolated from the host network and filesystem by default.

## When to Use

- Running untrusted or agent-generated code safely
- Testing software installations without polluting your system
- Isolated build/test environments
- Any task where you want a clean, temporary Linux environment

## Quick Start

```bash
# Run a simple command in the VM
npx @earendil-works/gondolin exec -- uname -a

# Mount your project and run commands
npx @earendil-works/gondolin exec --mount-hostfs "$PWD:/workspace" -- cd /workspace && npm test
```

## Core Concepts

### The VM is Disposable
Each `gondolin exec` creates a fresh VM, runs your command, and tears down. Changes don't persist unless you mount host directories.

### Network Access is OPEN by Default

- HTTP/HTTPS traffic is allowed by default (no restriction)
- Use `--allow-host` to restrict to specific hosts
- Internal ranges (localhost, 10.x, 192.168.x) are blocked
- DNS is synthetic by default (no upstream DNS)
- This is a security feature - the host mediates all traffic

### Secrets Never Enter the VM
This is Gondolin's key security feature. Use `--host-secret` to inject credentials that the guest can use but never see.

## Mounting Host Directories

Use `--mount-hostfs HOST:GUEST[:ro]` to expose host directories to the VM.

```bash
# Mount current directory at /workspace (read-write)
gondolin exec --mount-hostfs "$PWD:/workspace" -- ls /workspace

# Mount read-only (important for sensitive files)
gondolin exec --mount-hostfs "$PWD:/workspace:ro" -- cat /workspace/.env

# Multiple mounts
gondolin exec --mount-hostfs /data:/data:ro --mount-hostfs "$PWD:/workspace" -- ls /data
```

### Mount Syntax
- `HOST:GUEST` - read-write mount
- `HOST:GUEST:ro` - read-only mount
- Host path must exist and be a directory

## Network Control

### Allowing HTTP Hosts

```bash
# Allow specific host
gondolin exec --allow-host api.github.com -- curl -sS https://api.github.com/rate_limit

# Allow multiple hosts
gondolin exec --allow-host api.github.com --allow-host api.openai.com -- curl ...

# Wildcards supported
gondolin exec --allow-host "*.github.com" -- curl https://api.github.com/...
```

### Using Secrets (CRITICAL)

This is how you safely use API tokens inside the VM:

```bash
# Secret injection - host reads from $GITHUB_TOKEN env var
gondolin exec \
  --host-secret GITHUB_TOKEN@api.github.com \
  -- curl -sS -H "Authorization: Bearer $GITHUB_TOKEN" https://api.github.com/user

# With explicit value
gondolin exec \
  --host-secret GITHUB_TOKEN@api.github.com=ghp_xxxx \
  -- curl -sS -H "Authorization: Bearer $GITHUB_TOKEN" https://api.github.com/user
```

**How it works:**
1. Inside the VM, `$GITHUB_TOKEN` is a random placeholder (e.g., `GONDOLIN_SECRET_abc123`)
2. The guest CANNOT read the real value - it never enters the VM
3. When the guest makes an HTTP request to an allowed host, the host substitutes the placeholder with the real secret
4. If the guest tries to use the placeholder for a disallowed host, the request is blocked

### Basic Auth Secrets

```bash
gondolin exec \
  --host-secret USER@example.com \
  --host-secret PASS@example.com \
  -- curl -u "$USER:$PASS" https://example.com/private
```

The host handles base64 encoding automatically.

## Environment Variables

```bash
# Set environment variables (for non-secret values)
gondolin exec --env NODE_ENV=production --env DEBUG=* -- node app.js

# Set working directory
gondolin exec --mount-hostfs "$PWD:/workspace" --cwd /workspace -- npm start
```

**Important:** Don't use `--env` for secrets! Use `--host-secret` instead.

## Memory Filesystems

Create ephemeral in-memory mounts:

```bash
# Create a temp directory that disappears when VM exits
gondolin exec --mount-memfs /tmp -- ls /tmp
```

Useful for build artifacts you don't need to keep.

## Command Chaining

Since each exec starts a fresh VM, chain commands with `&&`:

```bash
# Install dependencies then run tests
gondolin exec \
  --mount-hostfs "$PWD:/workspace" \
  -- sh -lc 'cd /workspace && npm install && npm test'

# Multi-step workflow
gondolin exec \
  --mount-hostfs "$PWD:/workspace" \
  -- sh -lc 'cd /workspace && npm run build && npm run lint'
```

## Common Workflows

### Run npm commands in isolation

```bash
gondolin exec \
  --mount-hostfs "$PWD:/workspace" \
  --allow-host registry.npmjs.org \
  -- sh -lc 'cd /workspace && npm install'
```

### Test with a specific Node version

```bash
gondolin exec \
  --mount-hostfs "$PWD:/workspace" \
  -- sh -lc 'source ~/.nvm/nvm.sh && nvm use 20 && npm test'
```

### Run a script from your project

```bash
gondolin exec \
  --mount-hostfs "$PWD:/workspace" \
  --allow-host api.example.com \
  --host-secret API_KEY@api.example.com \
  -- sh -lc 'cd /workspace && ./scripts/deploy.sh'
```

### Inspect what packages are available

```bash
gondolin exec -- apk list --installed
```

## What NOT to Do

1. **Don't pass secrets via `--env`** - They're visible in the VM!
   ```bash
   # BAD - secret exposed in VM
   gondolin exec --env API_KEY=real_secret -- curl ...

   # GOOD - secret stays on host
   gondolin exec --host-secret API_KEY@api.example.com -- curl ...
   ```

2. **Don't mount your entire home directory** - You'll expose SSH keys, credentials, etc.

3. **Don't assume network needs restricting** - By default, HTTP/HTTPS to any host is allowed. Use `--allow-host` only if you want to limit egress.

4. **Don't expect persistence** - Each exec is a fresh VM. Use `--mount-hostfs` for files you need.

## Exit Codes

- Exit code 0 = success
- Exit code > 0 = command failed
- Exit code 255 = VM/error

Check stdout/stderr in the result for debugging.

## Requirements

- QEMU installed (`brew install qemu` on macOS, `apt install qemu-system-*` on Linux)
- Node.js >= 18
- First run downloads guest assets (~200MB), cached in `~/.cache/gondolin/`

## Examples Summary

```bash
# Basic
gondolin exec -- uname -a

# With project mounted
gondolin exec --mount-hostfs "$PWD:/workspace" -- ls /workspace

# With network access
gondolin exec --allow-host api.github.com -- curl https://api.github.com

# With secret (SAFE)
gondolin exec --host-secret TOKEN@api.github.com -- curl -H "Authorization: Bearer $TOKEN" https://api.github.com

# Full workflow
gondolin exec \
  --mount-hostfs "$PWD:/workspace" \
  --allow-host registry.npmjs.org \
  --allow-host api.github.com \
  --host-secret GITHUB_TOKEN@api.github.com \
  -- sh -lc 'cd /workspace && npm install && npm test'
```
