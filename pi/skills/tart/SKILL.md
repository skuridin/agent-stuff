---
name: tart
description: Use Tart CLI on macOS to manage virtual machines (create, clone, pull, run, stop, inspect IP, and exec) and prepare SSH-ready Linux VMs. Use when users ask for VM lifecycle operations or quick local VM environments.
compatibility: Requires macOS with Tart CLI installed and virtualization support enabled.
---

# Tart Skill

Use this skill when the user asks to work with Tart VMs.

## Goals

- Discover available Tart commands and local/remote VMs
- Create or clone VMs safely
- Start VMs (UI or headless)
- Retrieve VM IPs and provide SSH connection details
- Troubleshoot common Tart issues quickly

## Operating Rules

1. Confirm intent before destructive actions (`tart delete`, `tart prune`).
2. Prefer non-destructive workflows:
   - `tart pull` remote image
   - `tart clone` into a local working VM
3. If command syntax is unclear, check help first:
   - `tart --help`
   - `tart help <subcommand>`
4. For automation/headless usage, prefer:
   - `tart run --no-graphics <vm>`
5. Always report:
   - VM name
   - current state
   - IP (if running)
   - exact SSH command to use

## Quick Playbook

### 1) Inspect environment

```bash
tart --help
tart list
```

### 2) Get an Ubuntu base image

```bash
tart pull ghcr.io/cirruslabs/ubuntu:latest
```

### 3) Create a local VM from remote image

```bash
tart clone ghcr.io/cirruslabs/ubuntu:latest ubuntu-work
```

If a fresh Linux VM is needed without a prebuilt image:

```bash
tart create ubuntu-work --linux
```

### 4) Start VM

```bash
tart run --no-graphics ubuntu-work
```

If running in background is needed, launch it via shell backgrounding and keep logs.

### 5) Get IP and verify state

```bash
tart list
tart ip ubuntu-work
```

### 6) Run commands inside VM

```bash
tart exec ubuntu-work whoami
```

## SSH Preparation (Linux)

Use this only when user asks for SSH access.

1. Verify SSH service status:

```bash
tart exec <vm> sh -lc "sudo systemctl is-active ssh || sudo systemctl is-active sshd"
```

2. If needed, enable/start OpenSSH:

```bash
tart exec <vm> sh -lc "sudo systemctl enable --now ssh"
```

3. Prefer key-based auth. If user explicitly asks for password auth, update sshd config and restart service, then provide credentials securely.

4. Provide connection command:

```bash
ssh <user>@$(tart ip <vm>)
```

## Troubleshooting

- VM won’t start:
  - Check `tart run` output and macOS virtualization permissions.
- No IP assigned:
  - Wait and retry `tart ip <vm>`; confirm VM is `running` in `tart list`.
- `tart exec` fails:
  - Ensure guest agent exists in the image (Cirrus images include it).
- SSH not reachable:
  - Verify ssh service active inside guest.
  - Test TCP 22 reachability from host.

## Completion Checklist

Before finishing, provide:

- What was created/started/changed
- Current VM state from `tart list`
- VM IP
- SSH command
- Any credentials/config changes performed
