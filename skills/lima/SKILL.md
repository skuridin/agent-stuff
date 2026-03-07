---
name: lima
description: Use Lima CLI to manage Linux virtual machines on macOS (create, start, stop, shell, copy files, snapshots, clone). Lima provides Linux VMs with containerd/nerdctl for container workloads. Use when users ask for Linux VMs, container development environments, or cross-platform testing.
compatibility: Requires macOS with Lima installed (`brew install lima`). Supports QEMU and Apple Virtualization.framework (vz) backends.
---

# Lima Skill

Use this skill when the user asks to work with Lima VMs or needs Linux VMs on macOS.

## Goals

- Create and configure Lima instances from templates
- Manage VM lifecycle (start, stop, restart)
- Execute commands and copy files to/from VMs
- Manage snapshots for state preservation
- Clone instances for quick environment duplication

## Operating Rules

1. Confirm intent before destructive actions (`limactl delete`, `limactl factory-reset`, `limactl snapshot delete`).
2. Prefer the `default` instance name unless user specifies otherwise.
3. Use templates for consistent setups:
   - `template:default` - Ubuntu with containerd
   - `template:docker` - Docker-enabled VM
   - `template:alpine` - Lightweight Alpine Linux
4. For automation, always use `--tty=false` or `-y` to skip interactive prompts.
5. Always report:
   - Instance name
   - Current state
   - IP address (if available)
   - SSH access method

## Quick Playbook

### 1) Inspect environment

```bash
limactl --help
limactl list
limactl create --list-templates
```

### 2) Create an instance

Default Ubuntu instance:
```bash
limactl create --name=default
```

From a specific template:
```bash
limactl create --name=docker template:docker
```

With custom resources:
```bash
limactl create --name=dev --cpus=4 --memory=8 --disk=50
```

Using yq expressions for advanced config:
```bash
limactl create --name=dev --set='.cpus = 4 | .memory = "8GiB"'
```

### 3) Start an instance

```bash
limactl start default
```

Create and start in one command (if instance doesn't exist):
```bash
limactl start --name=dev template:docker
```

### 4) Check instance status

```bash
limactl list
limactl list --format json
limactl list -q  # quiet, names only
```

### 5) Execute commands in VM

Using limactl:
```bash
limactl shell default uname -a
limactl shell default --workdir /tmp pwd
```

Using the lima shorthand (default instance):
```bash
lima uname -a
```

For specific instance:
```bash
LIMA_INSTANCE=docker lima uname -a
```

### 6) Copy files

From guest to host:
```bash
limactl copy default:/etc/os-release .
```

From host to guest:
```bash
limactl copy ./myfile.txt default:/tmp/
```

Recursive directory copy:
```bash
limactl copy -r ./mydir default:/tmp/
```

### 7) Stop or restart

```bash
limactl stop default
limactl restart default
```

### 8) Disposable VM pattern (one-off tasks)

Create, use, and cleanup a temporary VM:

```bash
# Create with needed resources
limactl create --name=temp --memory=8 --tty=false template:default
limactl start temp

# Do work (install packages, run commands, etc.)
lima sudo apt-get install -y python3-pip
lima pip install some-package
lima python3 /tmp/script.py

# Cleanup when done
limactl stop temp
limactl delete temp
```

**Resource tips:**
- Default 4GB RAM works for most tasks
- ML/AI workloads (PyTorch, ML models) often need 8-16GB+
- Use `--tty=false` when running non-interactively (scripts, automation)

## Snapshot Management

Create a snapshot:
```bash
limactl snapshot create default --tag=before-update
```

List snapshots:
```bash
limactl snapshot list default
```

Restore from snapshot:
```bash
limactl snapshot apply default --tag=before-update
```

Delete a snapshot:
```bash
limactl snapshot delete default --tag=before-update
```

## Cloning Instances

Clone an existing instance:
```bash
limactl clone original clone-name
```

Clone and start immediately:
```bash
limactl clone original clone-name --start
```

Clone with modified resources:
```bash
limactl clone original clone-name --cpus=2 --memory=4
```

## SSH Access

Lima configures SSH automatically. Connect using:

```bash
# Show SSH config
limactl show-ssh --format=config default

# Connect via SSH
ssh -F ~/.lima/default/ssh.config lima-default
```

Or use the lima shell command which handles SSH internally.

### Port Forwarding to Access VM Services

Forward a VM port to localhost for accessing services running inside the VM:

```bash
ssh -F ~/.lima/<instance>/ssh.config -N -f -L <local-port>:127.0.0.1:<vm-port> lima-<instance>
```

Example - access VM's web server on localhost:8080:
```bash
ssh -F ~/.lima/default/ssh.config -N -f -L 8080:127.0.0.1:80 lima-default
```

Example - forward multiple ports for a VPN panel and proxy:
```bash
ssh -F ~/.lima/vpn-server/ssh.config -N -f -L 12053:127.0.0.1:2053 lima-vpn-server
```

To stop port forwarding, find and kill the SSH process:
```bash
pkill -f "12053:.*2053"
```

## Container Workloads

Lima includes containerd and nerdctl (Docker-compatible CLI):

```bash
# Run a container
lima nerdctl run -d --name nginx -p 8080:80 nginx:alpine

# List containers
lima nerdctl ps

# Build an image
lima nerdctl build -t myapp .
```

For Docker-compatible experience, use the `docker` template:
```bash
limactl create --name=docker template:docker
limactl start docker
lima docker run hello-world
```

## Common Templates

| Template | Description |
|----------|-------------|
| `default` | Ubuntu with containerd/nerdctl |
| `docker` | Docker Engine |
| `docker-rootful` | Docker with rootful mode |
| `alpine` | Minimal Alpine Linux |
| `debian` | Debian GNU/Linux |
| `archlinux` | Arch Linux |
| `fedora` | Fedora Linux |
| `centos-stream` | CentOS Stream |
| `buildkit` | BuildKit for container builds |
| `apptainer` | Apptainer (Singularity) |

## Advanced Options

### Resource Configuration

```bash
--cpus 4              # Number of CPUs
--memory 8            # Memory in GiB
--disk 100            # Disk size in GiB
--arch aarch64        # Architecture (x86_64, aarch64, riscv64)
```

**Memory guidelines:**
- 4GB (default): General tasks, scripting, light package installs
- 8GB: Moderate workloads, multiple services
- 16GB+: ML models, large downloads, memory-intensive processing

### Networking

```bash
--network vzNAT       # Use Apple's NAT
--network lima:shared # Use shared network with vmnet
--port-forward 8080:80  # Port forwarding
```

### Mounts

```bash
--mount /host/path          # Mount host directory (read-only)
--mount /host/path:w        # Mount host directory (writable)
--mount-writable            # Make all mounts writable
--mount-type virtiofs       # Use virtiofs for better performance
```

### Virtualization Backend

```bash
--vm-type vz      # Apple Virtualization.framework (faster on Apple Silicon)
--vm-type qemu    # QEMU (more compatible)
--rosetta         # Enable Rosetta for x86_64 emulation (vz only)
```

## Troubleshooting

- **VM won't start**:
  - Check `limactl list` for current state
  - Try `limactl delete <name>` and recreate
  - Check logs in `~/.lima/<name>/ha.stderr.log`

- **Process killed inside VM (exit code 137)**:
  - Likely OOM (Out of Memory) - increase `--memory`
  - Check with `lima free -h` or `lima dmesg | tail`

- **SSH connection fails**:
  - Ensure instance is running: `limactl list`
  - Try `limactl stop <name> && limactl start <name>`

- **Mount issues**:
  - Check mount type compatibility with VM type
  - For 9p/virtiofs, ensure VM supports it

- **Container runtime issues (systemd-based VMs)**:
  - Verify containerd status: `lima systemctl status containerd`
  - Restart containerd: `lima sudo systemctl restart containerd`

- **Service issues (Alpine/OpenRC)**:
  - Alpine uses OpenRC, not systemd
  - Check service: `lima sudo rc-service <name> status`
  - Start/stop: `lima sudo rc-service <name> start|stop|restart`
  - Enable on boot: `lima sudo rc-update add <name> default`
  - List enabled: `lima sudo rc-update show default`

- **Network connectivity**:
  - Test from inside VM: `lima ping -c 3 google.com`
  - Check DNS: `lima cat /etc/resolv.conf`

## Quirks & Notes

### Non-Root User Paths

Lima creates users with a `.linux` suffix in the home directory to avoid conflicts:
- Expected: `/home/<user>/`
- Actual: `/home/<user>.linux/`

Keep this in mind when accessing user-specific files, credentials, or config directories:
```bash
# Example: cloudflared credentials location
/home/redfield.linux/.cloudflared/cert.pem
```

## Completion Checklist

Before finishing, provide:

- Instance name(s) affected
- Current state from `limactl list`
- Commands executed and their results
- Any configuration changes made
- How to access the VM (shell command or SSH)
