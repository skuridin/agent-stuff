# Container CLI Command Reference

> Command availability may vary depending on your macOS version.

## Core Commands

### `container run`

Runs a container from an image. If a command is provided, it will execute inside the container; otherwise the image's default command runs. By default the container runs in the foreground and stdin remains closed unless `-i`/`--interactive` is specified.

**Usage**

```bash
container run [<options>] <image> [<arguments> ...]
```

**Arguments**

*   `<image>`: Image name
*   `<arguments>`: Container init process arguments

**Process Options**

*   `-e, --env <env>`: Set environment variables (format: key=value, or just key to inherit from host)
*   `--env-file <env-file>`: Read in a file of environment variables (key=value format, ignores # comments and blank lines)
*   `--gid <gid>`: Set the group ID for the process
*   `-i, --interactive`: Keep the standard input open even if not attached
*   `-t, --tty`: Open a TTY with the process
*   `-u, --user <user>`: Set the user for the process (format: name|uid[:gid])
*   `--uid <uid>`: Set the user ID for the process
*   `--ulimit <limit>`: Set resource limits (format: `<type>=<soft>[:<hard>]`)
*   `-w, --workdir, --cwd <dir>`: Set the initial working directory inside the container

**Resource Options**

*   `-c, --cpus <cpus>`: Number of CPUs to allocate to the container
*   `-m, --memory <memory>`: Amount of memory (1MiByte granularity), with optional K, M, G, T, or P suffix

**Management Options**

*   `-a, --arch <arch>`: Set arch if image can target multiple architectures (default: arm64)
*   `--cap-add <cap>`: Add a Linux capability (e.g. `CAP_NET_RAW`, `NET_RAW`, or `ALL`)
*   `--cap-drop <cap>`: Drop a Linux capability (e.g. `CAP_NET_RAW`, `NET_RAW`, or `ALL`)
*   `--cidfile <cidfile>`: Write the container ID to the path provided
*   `-d, --detach`: Run the container and detach from the process
*   `--dns <ip>`: DNS nameserver IP address
*   `--dns-domain <domain>`: Default DNS domain
*   `--dns-option <option>`: DNS options
*   `--dns-search <domain>`: DNS search domains
*   `--entrypoint <cmd>`: Override the entrypoint of the image
*   `--init`: Run an init process inside the container that forwards signals and reaps processes
*   `--init-image <image>`: Use a custom init image instead of the default. This allows customizing boot-time behavior before the OCI container starts, such as running VM-level daemons, configuring eBPF filters, or debugging the init process.
*   `-k, --kernel <path>`: Set a custom kernel path
*   `-l, --label <label>`: Add a key=value label to the container
*   `--mount <mount>`: Add a mount to the container (format: type=<>,source=<>,target=<>,readonly)
*   `--name <name>`: Use the specified name as the container ID
*   `--network <network>`: Attach the container to a network (format: `<name>[,mac=XX:XX:XX:XX:XX:XX][,mtu=VALUE]`)
*   `--no-dns`: Do not configure DNS in the container
*   `--os <os>`: Set OS if image can target multiple operating systems (default: linux)
*   `-p, --publish <spec>`: Publish a port from container to host (format: [host-ip:]host-port:container-port[/protocol])
*   `--platform <platform>`: Platform for the image if it's multi-platform. This takes precedence over --os and --arch
*   `--publish-socket <spec>`: Publish a socket from container to host (format: host_path:container_path)
*   `--read-only`: Mount the container's root filesystem as read-only
*   `--rm, --remove`: Remove the container after it stops
*   `--rosetta`: Enable Rosetta in the container
*   `--runtime`: Set the runtime handler for the container (default: container-runtime-linux)
*   `--ssh`: Forward SSH agent socket to container
*   `--shm-size <shm-size>`: Size of `/dev/shm` (e.g. 64M, 1G)
*   `--tmpfs <tmpfs>`: Add a tmpfs mount to the container at the given path
*   `-v, --volume <volume>`: Bind mount a volume into the container
*   `--virtualization`: Expose virtualization capabilities to the container (requires host and guest support)

**Registry Options**

*   `--scheme <scheme>`: Scheme to use when connecting to the container registry. One of (http, https, auto) (default: auto)

    * **Behavior of `auto`**

        When `auto` is selected, the target registry is considered **internal/local** if the registry host matches any of these criteria:
        - The host is a loopback address (e.g., `localhost`, `127.*`)
        - The host is within the `RFC1918` private IP ranges:
            - `10.*.*.*`
            - `192.168.*.*`
            - `172.16.*.*` through `172.31.*.*`
        - The host ends with the machine's default container DNS domain

        For internal/local registries, the client uses **HTTP**. Otherwise, it uses **HTTPS**.

**Progress Options**

*   `--progress <type>`: Progress type (format: auto|none|ansi|plain|color) (default: auto)

**Image Fetch Options**

*   `--max-concurrent-downloads <max-concurrent-downloads>`: Maximum number of concurrent downloads (default: 3)

**Examples**

```bash
# run a container and attach an interactive shell
container run -it ubuntu:latest /bin/bash

# run a background web server
container run -d --name web -p 8080:80 nginx:latest

# set environment variables and limit resources
container run -e NODE_ENV=production --cpus 2 --memory 1G node:18

# run a container with a specific MAC address
container run --network default,mac=02:42:ac:11:00:02 ubuntu:latest

# run a container with an init process to reap zombies and forward signals
container run --init ubuntu:latest my-app

# run a container with a custom init image for boot customization
container run --init-image local/custom-init:latest ubuntu:latest
```

### `container build`

Builds an OCI image from a local build context. It reads a Dockerfile (default `Dockerfile`) or Containerfile and produces an image tagged with `-t` option. The build runs in isolation using BuildKit, and resource limits may be set for the build process itself.

When no `-f/--file` is specified, the build command will look for `Dockerfile` first, then fall back to `Containerfile` if `Dockerfile` is not found.

**Usage**

```bash
container build [<options>] [<context-dir>]
```

**Arguments**

*   `<context-dir>`: Build directory (default: .)

**Options**

*   `-a, --arch <value>`: Add the architecture type to the build
*   `--build-arg <key=val>`: Set build-time variables
*   `-c, --cpus <cpus>`: Number of CPUs to allocate to the builder container (default: 2)
*   `--dns <ip>`: DNS nameserver IP address
*   `--dns-domain <domain>`: Default DNS domain
*   `--dns-option <option>`: DNS options
*   `--dns-search <domain>`: DNS search domains
*   `-f, --file <path>`: Path to Dockerfile
*   `-l, --label <key=val>`: Set a label
*   `-m, --memory <memory>`: Amount of builder container memory (1MiByte granularity), with optional K, M, G, T, or P suffix (default: 2048MB)
*   `--no-cache`: Do not use cache
*   `-o, --output <value>`: Output configuration for the build (format: type=<oci|tar|local>[,dest=]) (default: type=oci)
*   `--os <value>`: Add the OS type to the build
*   `--platform <platform>`: Add the platform to the build (format: os/arch[/variant], takes precedence over --os and --arch)
*   `--progress <type>`: Progress type (format: auto|plain|tty) (default: auto)
*   `--pull`: Pull latest image
*   `-q, --quiet`: Suppress build output
*   `--secret <id=key,...>`: Set build-time secrets (format: id=<key>[,env=<ENV_VAR>|,src=<local/path>])
*   `-t, --tag <name>`: Name for the built image (can be specified multiple times)
*   `--target <stage>`: Set the target build stage
*   `--vsock-port <port>`: Builder shim vsock port (default: 8088)

**Examples**

```bash
# build an image and tag it as my-app:latest
container build -t my-app:latest .

# use a custom Dockerfile
container build -f docker/Dockerfile.prod -t my-app:prod .

# pass build args
container build --build-arg NODE_VERSION=18 -t my-app .

# build the production stage only and disable cache
container build --target production --no-cache -t my-app:prod .

# build with multiple tags
container build -t my-app:latest -t my-app:v1.0.0 -t my-app:stable .
```

## Container Management

### `container create`

Creates a container from an image without starting it. This command accepts most of the same process/resource/management flags as `container run`, but leaves the container stopped after creation.

**Usage**

```bash
container create [<options>] <image> [<arguments> ...]
```

### `container start`

Starts a stopped container. You can attach to the container's output streams and optionally keep STDIN open.

**Usage**

```bash
container start [--attach] [--interactive] [--debug] <container-id>
```

**Options**

*   `-a, --attach`: Attach stdout/stderr
*   `-i, --interactive`: Attach stdin

### `container stop`

Stops running containers gracefully by sending a signal. A timeout can be specified before a SIGKILL is issued. If no containers are specified, nothing is stopped unless `--all` is used.

**Usage**

```bash
container stop [--all] [--signal <signal>] [--time <time>] [--debug] [<container-ids> ...]
```

**Options**

*   `-a, --all`: Stop all running containers
*   `-s, --signal <signal>`: Signal to send to the containers (default: SIGTERM)
*   `-t, --time <time>`: Seconds to wait before killing the containers (default: 5)

### `container kill`

Immediately kills running containers by sending a signal (defaults to `KILL`). Use with caution: it does not allow for graceful shutdown.

**Usage**

```bash
container kill [--all] [--signal <signal>] [--debug] [<container-ids> ...]
```

### `container delete (rm)`

Deletes one or more containers. If the container is running, you may force deletion with `--force`. Without a container ID, nothing happens unless `--all` is supplied.

**Usage**

```bash
container delete [--all] [--force] [--debug] [<container-ids> ...]
```

### `container list (ls)`

Lists containers. By default only running containers are shown. Output can be formatted as a table, JSON, YAML, or TOML.

**Usage**

```bash
container list [--all] [--format <format>] [--quiet] [--debug]
```

**Options**

*   `-a, --all`: Include containers that are not running
*   `--format <format>`: Format of the output (values: json, table, yaml, toml; default: table)
*   `-q, --quiet`: Only output the container ID

### `container exec`

Executes a command inside a running container. It uses the same process flags as `container run` to control environment, user, and TTY settings.

**Usage**

```bash
container exec [--detach] [--env <env> ...] [--env-file <env-file> ...] [--gid <gid>] [--interactive] [--tty] [--user <user>] [--uid <uid>] [--workdir <dir>] [--debug] <container-id> <arguments> ...
```

### `container export`

Exports a stopped container's filesystem as a tar archive. The container must be stopped before exporting. If no output file is specified, the tar stream is written to stdout.

**Usage**

```bash
container export [-o <output>] [--debug] <container-id>
```

### `container logs`

Fetches logs from a container. You can follow the logs (`-f`/`--follow`), restrict the number of lines shown, or view boot logs.

**Usage**

```bash
container logs [--boot] [--follow] [-n <n>] [--debug] <container-id>
```

**Options**

*   `--boot`: Display the boot log for the container instead of stdio
*   `-f, --follow`: Follow log output
*   `-n <n>`: Number of lines to show from the end of the logs. If not provided this will print all of the logs

### `container inspect`

Displays detailed container information in JSON. Pass one or more container IDs to inspect multiple containers.

**Usage**

```bash
container inspect [--debug] <container-ids> ...
```

### `container stats`

Displays real-time resource usage statistics for containers. Shows CPU percentage, memory usage, network I/O, block I/O, and process count. By default, continuously updates statistics in an interactive display (like `top`). Use `--no-stream` for a single snapshot.

**Usage**

```bash
container stats [--format <format>] [--no-stream] [--debug] [<container-ids> ...]
```

### `container copy (cp)`

Copies files between a container and the local filesystem. The container must be running. One of the source or destination must be a container reference in the form `container_id:path`.

**Usage**

```bash
container copy [--debug] <source> <destination>
```

### `container prune`

Removes stopped containers to reclaim disk space. The command outputs the amount of space freed after deletion.

**Usage**

```bash
container prune [--debug]
```

## Image Management

### `container image list (ls)`

Lists local images. Verbose output provides additional details such as image ID, creation time and full size; formatted output provides the same data in machine-readable form.

**Usage**

```bash
container image list [--format <format>] [--quiet] [--verbose] [--debug]
```

### `container image pull`

Pulls an image from a registry. Supports specifying a platform and controlling progress display.

**Usage**

```bash
container image pull [--scheme <scheme>] [--progress <type>] [--max-concurrent-downloads <max-concurrent-downloads>] [--arch <arch>] [--os <os>] [--platform <platform>] [--debug] <reference>
```

### `container image push`

Pushes an image to a registry. The flags mirror those for `image pull` with the addition of specifying a platform for multi-platform images.

**Usage**

```bash
container image push [--scheme <scheme>] [--progress <type>] [--arch <arch>] [--os <os>] [--platform <platform>] [--debug] <reference>
```

### `container image save`

Saves an image to a tar archive on disk. Useful for exporting images for offline transport.

**Usage**

```bash
container image save [--arch <arch>] [--os <os>] --output <output> [--platform <platform>] [--debug] <references> ...
```

### `container image load`

Loads images from a tar archive created by `image save`. The tar file must be specified via `--input`.

**Usage**

```bash
container image load --input <input> [--force] [--debug]
```

### `container image tag`

Applies a new tag to an existing image. The original image reference remains unchanged.

**Usage**

```bash
container image tag <source> <target> [--debug]
```

### `container image delete (rm)`

Deletes one or more images. If no images are provided, `--all` can be used to delete all images. Images currently referenced by running containers cannot be deleted without first removing those containers.

**Usage**

```bash
container image delete [--all] [--force] [--debug] [<images> ...]
```

### `container image prune`

Removes unused images to reclaim disk space. By default, only removes dangling images (images with no tags). Use `-a` to remove all images not referenced by any container.

**Usage**

```bash
container image prune [--all] [--debug]
```

### `container image inspect`

Shows detailed information for one or more images in JSON format. Accepts image names or IDs.

**Usage**

```bash
container image inspect [--debug] <images> ...
```

## Builder Management

### `container builder start`

Starts the BuildKit builder container. CPU and memory limits can be set for the builder.

**Usage**

```bash
container builder start [--cpus <cpus>] [--memory <memory>] [--dns <ip> ...] [--dns-domain <domain>] [--dns-option <option> ...] [--dns-search <domain> ...] [--debug]
```

**Options**

*   `-c, --cpus <cpus>`: Number of CPUs to allocate to the builder container (default: 2)
*   `-m, --memory <memory>`: Amount of builder container memory (1MiByte granularity), with optional K, M, G, T, or P suffix (default: 2048MB)

### `container builder status`

Shows the current status of the BuildKit builder.

**Usage**

```bash
container builder status [--format <format>] [--quiet] [--debug]
```

### `container builder stop`

Stops the BuildKit builder container.

**Usage**

```bash
container builder stop [--debug]
```

### `container builder delete (rm)`

Deletes the BuildKit builder container. It can optionally force deletion if the builder is still running.

**Usage**

```bash
container builder delete [--force] [--debug]
```

## Network Management (macOS 26+)

### `container network create`

Creates a new network with the given name.

**Usage**

```bash
container network create [--internal] [--label <label> ...] [--option <option> ...] [--plugin <plugin>] [--subnet <subnet>] [--subnet-v6 <subnet-v6>] [--debug] <name>
```

**Options**

*   `--internal`: Restrict to host-only network
*   `--label <label>`: Set metadata for a network
*   `--option <option>`: Set a plugin-specific option (key=value); may be repeated
*   `--plugin <plugin>`: Network plugin to use (default: `container-network-vmnet`)
*   `--subnet <subnet>`: Set the IPv4 subnet for a network (CIDR format, e.g., 192.168.100.0/24)
*   `--subnet-v6 <subnet-v6>`: Set the IPv6 prefix for a network (CIDR format, e.g., fd00:1234::/64)

### `container network delete (rm)`

Deletes one or more networks.

**Usage**

```bash
container network delete [--all] [--debug] [<network-names> ...]
```

### `container network prune`

Removes networks not connected to any containers. However, default and system networks are preserved.

**Usage**

```bash
container network prune [--debug]
```

### `container network list (ls)`

Lists user-defined networks.

**Usage**

```bash
container network list [--format <format>] [--quiet] [--debug]
```

### `container network inspect`

Shows detailed information about one or more networks.

**Usage**

```bash
container network inspect <networks> ... [--debug]
```

## Volume Management

### `container volume create`

Creates a new named volume with an optional size and driver-specific options.

**Usage**

```bash
container volume create [--label <label> ...] [--opt <opt> ...] [-s <s>] [--debug] <name>
```

**Driver Options**

Driver options are passed with `--opt key=value`. The following options are supported for the default `local` driver:

*   `size=<value>`: Volume size with optional unit suffix (K, M, G, T, P). Minimum 1 MiB. Equivalent to `-s`; if `-s` is also specified, `-s` takes precedence.
*   `journal=<mode>[:<size>]`: Configure ext4 journaling on the volume. `<mode>` must be one of:
    *   `ordered` — journals metadata only; data is written to disk before its metadata is committed (default kernel behavior, good balance of safety and performance)
    *   `writeback` — journals metadata only; data ordering relative to metadata commits is not guaranteed (fastest, least safe)
    *   `journal` — journals both metadata and data (safest, highest write amplification)

    An optional `:<size>` suffix sets the journal size (same unit suffixes as `size`). If omitted, the kernel selects a default journal size.

### `container volume delete (rm)`

Deletes one or more volumes by name. Volumes that are currently in use by containers (running or stopped) cannot be deleted.

**Usage**

```bash
container volume delete [--all] [--debug] [<names> ...]
```

### `container volume prune`

Removes all volumes that have no container references.

**Usage**

```bash
container volume prune [--debug]
```

### `container volume list (ls)`

Lists volumes.

**Usage**

```bash
container volume list [--format <format>] [--quiet] [--debug]
```

### `container volume inspect`

Displays detailed information for one or more volumes in JSON.

**Usage**

```bash
container volume inspect [--debug] <names> ...
```

## Registry Management

### `container registry login`

Authenticates with a registry. Credentials can be provided interactively or via flags.

**Usage**

```bash
container registry login [--scheme <scheme>] [--password-stdin] [--username <username>] [--debug] <server>
```

### `container registry logout`

Logs out of a registry, removing stored credentials.

**Usage**

```bash
container registry logout [--debug] <registry>
```

### `container registry list`

List image registry logins.

**Usage**

```bash
container registry list [--format <format>] [--quiet] [--debug]
```

## Container Machine Management

`m` is an alias for `container machine`.

### `container machine create`

Creates a container machine from an image and boots it.

**Usage**

```bash
container machine create [<options>] <image>
```

**Options**

*   `-n, --name <name>`: Name for the container machine
*   `--set-default`: Set this container machine as the default
*   `--no-boot`: Create the container machine without booting it
*   `--cpus <cpus>`: Number of virtual CPUs
*   `--memory <memory>`: Memory allocation (e.g., 2G, 8G). Default: half of system memory
*   `--home-mount <home-mount>`: User's home directory mount option (ro, rw, none). Default: rw

### `container machine run`

Runs a command in a container machine, booting it first if needed. With no command, it opens an interactive login shell.

**Usage**

```bash
container machine run [<options>] [<executable>] [<arguments> ...]
```

**Options**

*   `-n, --name <name>`: Container machine ID (uses default if not specified)
*   `-d, --detach`: Run a process in a container machine and detach from it
*   `--root`: Run as root instead of matching host user

### `container machine list (ls)`

Lists container machines. The default container machine is marked in the `DEFAULT` column.

**Usage**

```bash
container machine list [--format <format>] [--quiet] [--debug]
```

### `container machine inspect`

Displays detailed information about a container machine in JSON.

**Usage**

```bash
container machine inspect [--debug] [<id>]
```

### `container machine set`

Sets configuration values on a container machine. Changes take effect after the container machine is stopped and restarted.

**Usage**

```bash
container machine set [--name <name>] [--debug] <setting> ...
```

**Settings**

*   `cpus=<number>`: Number of virtual CPUs
*   `memory=<size>`: Memory allocation (e.g., 2G, 1G). Default: half of system memory
*   `home-mount=<string>`: User home directory mount option (ro, rw, none). Default: rw

### `container machine set-default`

Sets the default container machine.

**Usage**

```bash
container machine set-default [--debug] <id>
```

### `container machine logs`

Fetches logs from a container machine.

**Usage**

```bash
container machine logs [--boot] [--follow] [-n <n>] [--debug] [<id>]
```

### `container machine stop`

Stops a running container machine.

**Usage**

```bash
container machine stop [--debug] [<id>]
```

### `container machine delete (rm)`

Deletes a container machine, stopping it first if it is running.

**Usage**

```bash
container machine delete [--debug] <id>
```

## System Management

### `container system start`

Starts the container services and (optionally) installs a default kernel.

**Usage**

```bash
container system start [--app-root <app-root>] [--install-root <install-root>] [--log-root <log-root>] [--enable-kernel-install] [--disable-kernel-install] [--timeout <timeout>] [--debug]
```

### `container system stop`

Stops the container services and deregisters them from launchd.

**Usage**

```bash
container system stop [--prefix <prefix>] [--debug]
```

### `container system status`

Checks whether the container services are running and prints status information.

**Usage**

```bash
container system status [--prefix <prefix>] [--format <format>] [--debug]
```

### `container system version`

Shows version information for the CLI and, if available, the API server.

**Usage**

```bash
container system version [--format <format>] [--debug]
```

### `container system logs`

Displays logs from the container services.

**Usage**

```bash
container system logs [--follow] [--last <last>] [--debug]
```

### `container system df`

Shows disk usage for images, containers, and volumes.

**Usage**

```bash
container system df [--format <format>] [--debug]
```

### `container system dns create`

Creates a local DNS domain for containers. Requires administrator privileges (use sudo).

**Usage**

```bash
container system dns create [--debug] [--localhost <localhost>] <domain-name>
```

### `container system dns delete (rm)`

Deletes a local DNS domain. Requires administrator privileges (use sudo).

**Usage**

```bash
container system dns delete [--debug] <domain-name>
```

### `container system dns list (ls)`

Lists configured local DNS domains for containers.

**Usage**

```bash
container system dns list [--format <format>] [--quiet] [--debug]
```

### `container system kernel set`

Installs or updates the Linux kernel used by the container runtime on macOS hosts.

**Usage**

```bash
container system kernel set [--arch <arch>] [--binary <binary>] [--force] [--recommended] [--tar <tar>] [--debug]
```

### `container system property list (ls)`

Lists all system properties with their current values. Output can be formatted as JSON or TOML.

**Usage**

```bash
container system property list [--format <format>] [--debug]
```
