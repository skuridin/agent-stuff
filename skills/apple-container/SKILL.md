---
name: apple-container
description: Use this skill when the user wants to work with Apple's `container` CLI for macOS — building, running, or managing lightweight Linux containers using per-container VMs. Covers container lifecycle, image builds, networking, volumes, container machines, system configuration, and troubleshooting. Not for Docker, Podman, or other Linux container runtimes.
---

# Apple Container (`container` CLI)

## Use this skill when

- Running, creating, stopping, or managing containers on macOS with Apple's `container` tool
- Building OCI images from Dockerfiles or Containerfiles
- Configuring container resources (CPU, memory, networking, volumes, capabilities)
- Working with container machines (persistent Linux environments)
- Troubleshooting container issues, networking, or system configuration
- Managing images, registries, builders, or container system services

## Before you start

1. Verify the environment: `container` is **macOS-only** and requires macOS 15+ (full features on macOS 26+). It is not Docker-compatible.
2. Ensure the system is running: `container system status` or `container system start`
3. Check the CLI version: `container --version`

## Core concepts

- **Per-container VMs**: Each container runs in its own lightweight Linux VM (not a shared VM). This gives stronger isolation and privacy than Docker Desktop.
- **OCI images**: Standard Docker/OCI images work. Images built with `container` run anywhere OCI-compatible.
- **Container machines**: Persistent Linux environments with your host home directory mounted in. Good for development workflows.
- **Builder**: A separate BuildKit VM used by `container build`. It has its own CPU/memory limits.

## Common workflows

### Run a container

```bash
# Interactive shell
container run -it ubuntu:latest /bin/bash

# Background with port forward and auto-remove
container run -d --rm --name web -p 8080:80 nginx:latest

# With resource limits and volumes
container run --cpus 8 --memory 32g -v ${HOME}/projects:/projects ubuntu:latest

# Multi-platform run
container run --arch amd64 --rm ubuntu:latest uname -m
```

### Build an image

```bash
# Standard build
container build -t my-app:latest .

# Custom Dockerfile, production stage, no cache
container build -f docker/Dockerfile.prod --target production --no-cache -t my-app:prod .

# Multi-platform build
container build --arch arm64 --arch amd64 -t my-app:latest .

# Build with custom builder resources
container builder start --cpus 8 --memory 32g
container build -t my-app:latest .
```

### Container lifecycle

```bash
container create --name my-app --cpus 2 --memory 1g ubuntu:latest
container start my-app
container stop my-app
container delete my-app
container prune          # remove stopped containers
```

### Container machines

```bash
container machine create alpine:latest --name dev
container machine set-default dev
container machine run                  # interactive shell
container machine run -n dev -- make   # run command
container machine stop dev
container machine rm dev
```

### Networking (macOS 26+)

```bash
container network create foo --subnet 192.168.100.0/24
container run -d --name web --network foo --rm nginx:latest
container network delete foo
```

On macOS 15: only the default network exists, container-to-container networking is not available, and `--network` options on `run`/`create` error.

### Volumes

```bash
container volume create myvol --opt size=10g
container run -v myvol:/data alpine:latest
container volume delete myvol
container volume prune
```

### System management

```bash
container system start
container system status
container system stop
container system logs
container system df
container system property list
```

## Important gotchas

- **macOS 15 limitations**: No custom networks, no container-to-container networking, and possible IP/subnet disagreements causing no network access. If networking fails, check the troubleshooting section of `references/how-to.md`.
- **Memory ballooning**: Memory freed by Linux inside the VM is not returned to macOS. Memory-intensive containers may need occasional restart to reduce host memory usage.
- **Builder resources**: The builder has its own defaults (2 CPUs, 2 GiB). For large builds, explicitly start it with `container builder start --cpus X --memory Yg` before building.
- **Anonymous volumes**: Unlike Docker, anonymous volumes do NOT auto-cleanup with `--rm`. Manual deletion is required.
- **SSH forwarding**: Use `--ssh` instead of manual volume mounts for `SSH_AUTH_SOCK`. The path is automatically updated across login sessions.
- **Capabilities**: Default set includes `CAP_NET_RAW`, `CAP_NET_BIND_SERVICE`, etc. Use `--cap-add`/`--cap-drop` with or without `CAP_` prefix (case-insensitive).
- **DNS domains**: `container system dns create` requires `sudo`. It disables Private Relay and the rule is removed on restart.
- **Registry scheme**: `--scheme auto` uses HTTP for loopback, RFC1918 private ranges, and the default container DNS domain; HTTPS otherwise.
- **Image pull for multi-platform**: When pulling, specify `--platform` or `--arch`/`--os` to select the correct variant.

## Output format

When summarizing container status or results, prefer tabular or JSON format:

```bash
container list --format json
container image list --format json
container system status --format json
```

## Validation checklist

Before declaring a container command successful:

- [ ] Check `container system status` is healthy
- [ ] Verify container is running: `container list` or `container inspect <id>`
- [ ] For networking: test connectivity from inside the container
- [ ] For builds: verify the image exists with `container image list`
- [ ] For volumes: confirm the mount is correct in `container inspect <id>`

## Supporting files

Read these when detailed reference is needed:

- `references/command-reference.md` — full CLI command reference, flags, and arguments for every `container` subcommand
- `references/how-to.md` — detailed how-to guides, examples, and troubleshooting (multi-platform builds, custom init images, capability control, MAC addresses, host service access, stats, logs, completions)
- `references/system-config.md` — `config.toml` schema, defaults, and type formats for system properties
- `references/container-machine.md` — container machine deep-dive, custom images, and systemd setup

## Debugging tips

- Use `--debug` flag on any command for verbose output
- Use `container logs <id>` for application logs, `container logs --boot <id>` for VM boot logs
- Use `container system logs` for service-level logs
- Use `container stats` for real-time resource usage (like `top`)
- For bug reports, collect: `sw_vers`, `xcodebuild -version`, `container --version`, and relevant logs with `--debug`
