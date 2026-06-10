# How-to

How to use the features of `container`.

## Configure memory and CPUs for your containers

Since the containers created by `container` are lightweight virtual machines, consider the needs of your containerized application when you use `container run`.  The `--memory` and `--cpus` options allow you to override the default memory and CPU limits for the virtual machine. The default values are 1 gigabyte of RAM and 4 CPUs. You can use abbreviations for memory units; for example, to run a container for image `big` with 8 CPUs and 32 GiBytes of memory, use:

```bash
container run --rm --cpus 8 --memory 32g big
```

## Configure memory and CPUs for large builds

When you first run `container build`, `container` starts a *builder*, which is a utility container that builds images from your `Dockerfile`s. As with anything you run with `container run`, the builder runs in a lightweight virtual machine, so for resource-intensive builds, you may need to increase the memory and CPU limits for the builder VM.

By default, the builder VM receives 2 GiBytes of RAM and 2 CPUs. You can change these limits by starting the builder container before running `container build`:

```bash
container builder start --cpus 8 --memory 32g
```

If your builder is already running and you need to modify the limits, just stop, delete, and restart the builder:

```bash
container builder stop
container builder delete
container builder start --cpus 8 --memory 32g
```

## Share host files with your container

With the `--volume` option of `container run`, you can share data between the host system and one or more containers, and you can persist data across multiple container runs. The volume option allows you to mount a folder on your host to a filesystem path in the container.

This example mounts a folder named `assets` on your Desktop to the directory `/content/assets` in a container:

```bash
ls -l ~/Desktop/assets
container run --volume ${HOME}/Desktop/assets:/content/assets docker.io/python:alpine ls -l /content/assets
```

The argument to `--volume` in the example consists of the full pathname for the host folder and the full pathname for the mount point in the container, separated by a colon.

The `--mount` option uses a comma-separated `key=value` syntax to achieve the same result:

```bash
container run --mount source=${HOME}/Desktop/assets,target=/content/assets docker.io/python:alpine ls -l /content/assets
```

## Build and run a multiplatform image

When building the image, just add `--arch` options that direct the builder to create an image supporting both the `arm64` and `amd64` architectures:

```bash
container build --arch arm64 --arch amd64 --tag registry.example.com/fido/web-test:latest --file Dockerfile .
```

Try running the command `uname -a` with the `arm64` variant of the image to see the system information that the virtual machine reports:

```bash
container run --arch arm64 --rm registry.example.com/fido/web-test:latest uname -a
```

When you run the command with the `amd64` architecture, the x86-64 version of `uname` runs under Rosetta translation, so that you will see information for an x86-64 system:

```bash
container run --arch amd64 --rm registry.example.com/fido/web-test:latest uname -a
```

The command to push your multiplatform image to a registry is no different than that for a single-platform image:

```bash
container image push registry.example.com/fido/web-test:latest
```

## Get container or image details

`container image list` and `container list` provide basic information for all of your images and containers. You can also use `list` and `inspect` commands to print detailed machine-readable output for resources.

Use the `inspect` command and send the result to the `jq` command to get pretty-printed JSON for the images or containers that you specify:

```bash
container image inspect web-test | jq
container inspect my-web-server | jq
```

Use the `list` command with the `--format` option to display information for all images or containers. In this example, the `--all` option shows stopped as well as running containers, and `jq` selects the IP address for each running container:

```bash
container ls --format json --all | jq '.[] | select ( .status == "running" ) | [ .configuration.id, .networks[0].address ]'
```

## Forward traffic from `localhost` to your container

Use the `--publish` option to forward TCP or UDP traffic from your loopback IP to the container you run. The option value has the form `[host-ip:]host-port:container-port[/protocol]`, where protocol may be `tcp` or `udp`, case insensitive.

If your container attaches to multiple networks, the ports you publish forward to the IP address of the interface attached to the first network.

To forward requests from port 8080 on the IPv4 loopback IP to a NodeJS webserver on container port 8000, run:

```bash
container run -d --rm -p 127.0.0.1:8080:8000 node:latest npx http-server -a :: -p 8000
```

Test access using `curl`:

```console
curl http://127.0.0.1:8080
```

To forward requests from port 8080 on the IPv6 loopback IP:

```bash
container run -d --rm -p '[::1]:8080:8000' node:latest npx http-server -a :: -p 8000
```

Test access using `curl`:

```console
curl -6 'http://[::1]:8080'
```

## Access a host service from a container

> [!IMPORTANT]
> Due to macOS security constraints around packet filter rules, this feature has limited functionality:
> - Creating a localhost domain disables Private Relay.
> - The local domain packet filter rule is removed on a restart.

Create a DNS domain with `--localhost <ipv4-address>` to make a domain used by a container to access a host service. Any IPv4 address can be used as `<ipv4-address>`, which will be assigned to the domain name in container.

Choose an IP address that is least likely to conflict with any networks or reserved IP addresses in your environment. Reasonably safe address ranges include:

- The documentation ranges 192.0.2.0/24, 198.51.100.0/24, and 203.0.113.0/24.
- The 172.16.0.0/12 private range.

To connect a host HTTP server from a container, run:

```bash
mkdir -p /tmp/test; cd /tmp/test; echo "hello" > index.html
python3 -m http.server 8000 --bind 127.0.0.1
```

Create a domain for host connection:

```bash
sudo container system dns create host.container.internal --localhost 203.0.113.113
```

Test access to the host HTTP server from a container:

```bash
container run -it --rm alpine/curl curl http://host.container.internal:8000
```

## Set a custom MAC address for your container

Use the `mac` option to specify a custom MAC address for your container's network interface. This is useful for:
- Network testing scenarios requiring predictable MAC addresses
- Consistent network configuration across container restarts

The MAC address must be in the format `XX:XX:XX:XX:XX:XX` (with colons or hyphens as separators). Set the two least significant bits of the first octet to `10` (locally signed, unicast address). 

```bash
container run --network default,mac=02:42:ac:11:00:02 ubuntu:latest
```

To verify the MAC address is set correctly, read the interface MAC directly from sysfs inside the container:

```bash
container run --rm --network default,mac=02:42:ac:11:00:02 ubuntu:latest cat /sys/class/net/eth0/address
```

If you don't specify a MAC address, `container` will generate one for you. The generated address has a first nibble set to hexadecimal `f` (`fX:XX:XX:XX:XX:XX`) in case you want to minimize the very small chance of conflict between your MAC address and generated addresses. 

## Mount your host SSH authentication socket in your container

Use the `--ssh` option to mount the macOS SSH authentication socket into your container, so that you can clone private git repositories and perform other tasks requiring passwordless SSH authentication.

When you use `--ssh`, it performs the equivalent of the options `--volume "${SSH_AUTH_SOCK}:/run/host-services/ssh-auth.sock" --env SSH_AUTH_SOCK=/run/host-services/ssh-auth.sock"`. The added benefit of `--ssh` is that when you stop your container, log out, log back in, and restart your container, the system automatically updates the target path for the socket mount to the new value of `SSH_AUTH_SOCK`, so that socket forwarding continues to function.

```bash
container run -it --rm --ssh alpine:latest sh
```

## Create and use a separate isolated network

> [!NOTE]
> This feature is available on macOS 26 and later.

Running `container system start` creates a vmnet network named `default` to which your containers will attach unless you specify otherwise.

You can create a separate isolated network using `container network create`.

```bash
container network create foo
container network create foo --subnet 192.168.100.0/24 --subnet-v6 fd00:1234::/64
```

The `foo` network, the default network, and any other networks you create are isolated from one another. A container on one network has no connectivity to containers on other networks.

Run `container network list` to see the networks that exist:

```bash
container network list
```

Run a container that is attached to that network using the `--network` flag:

```bash
container run -d --name my-web-server --network foo --rm web-test
```

You can delete networks that you create once no containers are attached:

```bash
container stop my-web-server
container network delete foo
```

Networks support both IPv4 and IPv6. When creating a network without explicit subnet options, the system uses default values if configured via system properties, or automatically allocates subnets. The system validates that custom subnets don't overlap with existing networks.

## Configure default network subnets

You can customize the default IPv4 and IPv6 subnets used for new networks by editing your runtime configuration file at `~/.config/container/config.toml`:

```toml
[network]
subnet = "192.168.100.1/24"
subnetv6 = "fd00:abcd::/64"
```

These settings apply to networks created without explicit `--subnet` or `--subnet-v6` options.

## View container logs

The `container logs` command displays the output from your containerized application:

```bash
container run -d --name my-web-server --rm registry.example.com/fido/web-test:latest
container logs my-web-server
```

Use the `--boot` option to see the logs for the virtual machine boot and init process:

```bash
container logs --boot my-web-server
```

## Monitor container resource usage

The `container stats` command displays real-time resource usage statistics for your running containers, similar to the `top` command for processes. This is useful for:
- Monitoring CPU and memory consumption
- Tracking network and disk I/O
- Identifying resource-intensive containers
- Verifying container resource limits are appropriate

By default, `container stats` shows live statistics for all running containers in an interactive display:

```bash
container stats
```

To monitor specific containers, provide their names or IDs:

```bash
container stats my-web-server db
```

For a single snapshot (non-interactive), use the `--no-stream` flag:

```bash
container stats --no-stream my-web-server
```

You can also output statistics in JSON format for scripting:

```bash
container stats --format json --no-stream my-web-server | jq
```

**Understanding the metrics:**

- **Cpu %**: Percentage of CPU usage. ~100% = one fully utilized core. A multi-core container can show > 100%.
- **Memory Usage**: Current memory usage vs. the container's memory limit.
- **Net Rx/Tx**: Network bytes received and transmitted.
- **Block I/O**: Disk bytes read and written.
- **Pids**: Number of processes running in the container.

## Control Linux capabilities

By default, containers start with a restricted set of Linux capabilities:

`CAP_AUDIT_WRITE`, `CAP_CHOWN`, `CAP_DAC_OVERRIDE`, `CAP_FOWNER`, `CAP_FSETID`, `CAP_KILL`, `CAP_MKNOD`, `CAP_NET_BIND_SERVICE`, `CAP_NET_RAW`, `CAP_SETFCAP`, `CAP_SETGID`, `CAP_SETPCAP`, `CAP_SETUID`, `CAP_SYS_CHROOT`

You can customize the capability set using `--cap-add` and `--cap-drop` with `container run` or `container create`.

Capability names can be specified with or without the `CAP_` prefix, and are case-insensitive:

```bash
container run --cap-add CAP_NET_ADMIN alpine ip link set lo down
container run --cap-add NET_ADMIN alpine ip link set lo down
container run --cap-add net_admin alpine ip link set lo down
```

To grant all capabilities:

```bash
container run --cap-add ALL alpine sh -c "ip link set lo down && echo ok"
```

To drop all capabilities and selectively re-add only what you need:

```bash
container run --cap-drop ALL --cap-add SETUID --cap-add SETGID alpine id
```

Adds are processed after drops, so `--cap-drop ALL --cap-add ALL` results in all capabilities being granted.

To grant all capabilities except specific ones:

```bash
container run --cap-add ALL --cap-drop NET_ADMIN alpine sh
```

To drop a single capability from the default set:

```bash
container run --cap-drop CHOWN alpine chown 100 /tmp
```

## Expose virtualization capabilities to a container

> [!NOTE]
> This feature requires a M3 or newer Apple silicon machine and a Linux kernel that supports virtualization.

You can enable virtualization capabilities in containers by using the `--virtualization` option of `container run` and `container create`.

If your machine does not have support for nested virtualization, you will see the following:

```bash
container run --name nested-virtualization --virtualization --kernel /path/to/a/kernel/with/virtualization/support --rm ubuntu:latest sh -c "dmesg | grep kvm"
# Error: unsupported: "nested virtualization is not supported on the platform"
```

When nested virtualization is enabled successfully, `dmesg` will show output like the following:

```bash
container run --name nested-virtualization --virtualization --kernel /path/to/a/kernel/with/virtualization/support --rm ubuntu:latest sh -c "dmesg | grep kvm"
# [    0.017245] kvm [1]: IPA Size Limit: 40 bits
# ...
# [    0.017893] kvm [1]: Hyp mode initialized successfully
```

## Run a container with a provided init process

By default, the command you specify in `container run` runs as PID 1 inside the container. This means it is responsible for reaping zombie processes and handling signals, which many applications are not designed to do. The `--init` flag runs a lightweight init process as PID 1 that automatically forwards signals and reaps orphaned child processes.

```bash
container run --init ubuntu:latest my-app
```

The init process is also available with `container create`:

```bash
container create --init --name my-container ubuntu:latest my-app
container start my-container
```

## Use a custom init image

The `--init-image` flag allows you to specify a custom init filesystem image for the lightweight VM that runs your container. This enables:

- Custom boot-time logic before the OCI container starts
- Running additional processes and daemons (e.g., eBPF network filters, logging agents) inside the VM
- Debugging or instrumenting the init process

### Create a custom init image

A custom init image wraps the default `vminitd` binary, allowing you to run custom logic before handing off to the standard init process.

**1. Create a wrapper binary (example in Go for easy cross-compilation):**

```go
// wrapper.go
package main

import (
    "os"
    "syscall"
)

func main() {
    // Write a message to kernel log
    kmsg, err := os.OpenFile("/dev/kmsg", os.O_WRONLY, 0)
    if err == nil {
        kmsg.WriteString("<6>custom-init: === CUSTOM INIT IMAGE RUNNING ===\n")
        kmsg.Close()
    }

    // Execute the real vminitd
    err = syscall.Exec("/sbin/vminitd.real", os.Args, os.Environ())
    if err != nil {
        os.Exit(1)
    }
}
```

**2. Build the wrapper for Linux arm64:**

```bash
CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -o wrapper wrapper.go
```

**3. Create a Containerfile:**

Use the `vminit` image tag corresponding to the `scVersion` value in the project `Package.swift` file.

Or, use `vminit:latest` if you have a local `containerization` project in edit mode.

```dockerfile
FROM ghcr.io/apple/containerization/vminit:0.33.3 AS base

FROM ghcr.io/apple/containerization/vminit:0.33.3
COPY --from=base /sbin/vminitd /sbin/vminitd.real
COPY wrapper /sbin/vminitd
```

**4. Build the custom init image:**

```bash
container build -t local/custom-init:latest .
```

### Run a container with a custom init image

```bash
container run --name my-container --init-image local/custom-init:latest alpine:latest echo "hello"
```

### Verify the custom init is running

Check the VM boot logs to confirm your custom init code executed:

```bash
container logs --boot my-container | grep custom-init
```

## Use container machines

Container machines are persistent Linux environments built from OCI images — your home directory is mounted in, the user account matches your host account, and the filesystem survives stop and start. See `container-machine.md` for the full guide.

## Configure system properties

The `container system property` subcommand manages the configuration settings for the `container` CLI and services. You can customize various aspects of container behavior, including build settings, default images, and network configuration.

Use `container system property list` to show all properties that have set defaults:

```bash
container system property ls
```

### Example: Disable Rosetta for builds

If you want to prevent the use of Rosetta translation during container builds on Apple Silicon Macs, set the following in `~/.config/container/config.toml`:

```toml
[build]
rosetta = false
```

This is useful when you want to ensure builds only produce native arm64 images and avoid any x86_64 emulation.

## View system logs

The `container system logs` command allows you to look at the log messages that `container` writes:

```bash
container system logs | tail -8
```

## Generating and installing completion scripts

### Overview

The `container --generate-completion-script [zsh|bash|fish]` command generates completion scripts for the provided shell.

### Installing `zsh` completions

If you have [oh-my-zsh](https://ohmyz.sh/) installed, you already have a directory of automatically loaded completion scripts — `.oh-my-zsh/completions`. Copy your new completion script to that directory.

```zsh
mkdir -p ~/.oh-my-zsh/completions
container --generate-completion-script zsh > ~/.oh-my-zsh/completions/_container
source ~/.oh-my-zsh/completions/_container
```

> [!NOTE]
> Your completion script must have the filename `_container`.

Without oh-my-zsh, add a path for completion scripts to your function path:

```bash
fpath=(~/.zsh/completion $fpath)
autoload -U compinit
compinit
```

Next, create the directory and copy the completion script:

```zsh
mkdir -p ~/.zsh/completion
container --generate-completion-script zsh > ~/.zsh/completion/_container
source ~/.zshrc
```

### Installing `bash` completions

If you have [bash-completion](https://github.com/scop/bash-completion) installed, copy your new completion script to the `bash_completion.d` directory.

```bash
container --generate-completion-script bash > /opt/homebrew/etc/bash_completion.d/container
source /opt/homebrew/etc/bash_completion.d/container
```

Without bash-completion, source the completion script directly:

```bash
mkdir -p ~/.bash_completions
container --generate-completion-script bash >  ~/.bash_completions/container
source ~/.bash_completions/container
```

Add the following line to `~/.bash_profile` or `~/.bashrc` for every new bash session:

```bash
source ~/.bash_completions/container
```

### Installing `fish` completions

Copy the completion script to any path listed in the environment variable `$fish_completion_path`.

```bash
container --generate-completion-script fish > ~/.config/fish/completions/container.fish
```

## Troubleshooting

### All networking fails on macOS 15

In macOS 15, limitations in the vmnet framework mean that the container network can only be created when the first container starts. Since the network XPC helper provides IP addresses to containers, and the helper has to start before the first container, it is possible for the network helper and vmnet to disagree on the subnet address, resulting in containers that are completely cut off from the network.

Normally, vmnet creates the container network using the CIDR address 192.168.64.1/24, and on macOS 15, `container` defaults to using this CIDR address in the network helper.

If your containers have no network access on macOS 15:

1. Check the current network helper subnet:
   ```bash
   container network list
   ```
   Look at the `SUBNET` column for the `default` network.

2. Check the vmnet subnet by looking at the container's IP address:
   ```bash
   container inspect <container-id> | jq '.[0].networks[0].address'
   ```

3. If the network helper and vmnet disagree, you can try to force the network helper to use the correct subnet by stopping all containers and restarting the system:
   ```bash
   container stop --all
   container system stop
   container system start
   ```

4. If the issue persists, you may need to set the default subnet explicitly in `~/.config/container/config.toml`:
   ```toml
   [network]
   subnet = "192.168.64.0/24"
   ```
