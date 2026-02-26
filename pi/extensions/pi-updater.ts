/**
 * Pi Updater Extension
 *
 * Personal tool - not meant to be public.
 * Provides /update-pi command to check for and install pi updates.
 * Detects the package manager used to install pi and uses the appropriate update command.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import * as fs from "node:fs/promises";
import * as path from "node:path";

const execAsync = promisify(exec);

const PACKAGE = "@mariozechner/pi-coding-agent";

// Package manager path patterns for detection
const PM_PATH_PATTERNS = {
	fnm: ["fnm_multishells", ".fnm"],
	bun: ["bun/install/global", ".bun/install/global"],
	yarn: [".yarn/global", "yarn/global"],
	pnpm: [".pnpm-global", "pnpm/global"],
	npm: ["/lib/node_modules/", "/node_modules/.bin/", "AppData/Roaming/npm", "npm-global"],
} as const;

type PackageManager = "npm" | "bun" | "yarn" | "pnpm" | "fnm";
type NotificationLevel = "info" | "warning" | "error" | "success";

interface PackageManagerInfo {
	name: PackageManager;
	command: string;
	args: string[];
}

interface UpdateContext {
	ui: {
		setStatus: (id: string, status: string | undefined) => void;
		confirm: (title: string, message: string) => Promise<boolean>;
		notify: (message: string, level: NotificationLevel) => void;
	};
}

/**
 * Get the pi binary path
 */
async function getPiBinaryPath(): Promise<string | null> {
	try {
		const isWindows = process.platform === "win32";
		const whichCmd = isWindows ? "where.exe pi" : "which pi";
		const { stdout } = await execAsync(whichCmd, {
			encoding: "utf-8",
			timeout: 10000,
		});
		const trimmed = stdout.trim();
		if (!trimmed) {
			return null;
		}
		// Take first line if multiple matches
		return trimmed.split("\n")[0].trim() || null;
	} catch (err) {
		console.error("getPiBinaryPath: Failed to find pi:", err);
		return null;
	}
}

/**
 * Get the current installed version of pi
 */
async function getCurrentVersion(): Promise<string> {
	try {
		const piBinaryPath = await getPiBinaryPath();
		if (!piBinaryPath) {
			console.error("getCurrentVersion: Could not find pi binary path");
			return "unknown";
		}

		// Resolve symlink if it's a symlink
		let resolvedPath = piBinaryPath;
		try {
			resolvedPath = await fs.realpath(piBinaryPath);
		} catch {
			// Not a symlink or can't resolve
		}

		// The binary is at .../node_modules/@mariozechner/pi-coding-agent/dist/cli.js
		// package.json is at .../node_modules/@mariozechner/pi-coding-agent/package.json
		const packageJsonPath = path.join(path.dirname(path.dirname(resolvedPath)), "package.json");

		try {
			const content = await fs.readFile(packageJsonPath, "utf-8");
			const pkgJson = JSON.parse(content);
			return pkgJson.version;
		} catch (err) {
			console.error("getCurrentVersion: Failed to read/parse package.json:", err);
			return "unknown";
		}
	} catch (err) {
		console.error("getCurrentVersion: Unexpected error:", err);
		return "unknown";
	}
}

/**
 * Fetch the latest version from npm registry
 */
async function getLatestVersion(): Promise<string | null> {
	try {
		const { stdout } = await execAsync("npm show @mariozechner/pi-coding-agent version", {
			encoding: "utf-8",
			timeout: 15000,
		});
		const version = stdout.trim();
		if (!version) {
			console.error("getLatestVersion: Empty version response from npm");
			return null;
		}
		return version;
	} catch (err) {
		console.error("getLatestVersion: Failed to fetch version:", err);
		return null;
	}
}

/**
 * Detect which package manager was used to install pi
 */
async function detectPackageManager(): Promise<PackageManagerInfo | null> {
	try {
		const piBinaryPath = await getPiBinaryPath();
		if (!piBinaryPath) return null;

		const normalizedPath = piBinaryPath.replace(/\\/g, "/");

		// fnm is a Node version manager - global packages use npm
		if (PM_PATH_PATTERNS.fnm.some((pattern) => normalizedPath.includes(pattern))) {
			return {
				name: "fnm",
				command: "npm",
				args: ["install", "-g", `${PACKAGE}@latest`],
			};
		}

		if (PM_PATH_PATTERNS.bun.some((pattern) => normalizedPath.includes(pattern))) {
			return {
				name: "bun",
				command: "bun",
				args: ["update", "-g", PACKAGE],
			};
		}

		if (PM_PATH_PATTERNS.yarn.some((pattern) => normalizedPath.includes(pattern))) {
			return {
				name: "yarn",
				command: "yarn",
				args: ["global", "add", `${PACKAGE}@latest`],
			};
		}

		if (PM_PATH_PATTERNS.pnpm.some((pattern) => normalizedPath.includes(pattern))) {
			return {
				name: "pnpm",
				command: "pnpm",
				args: ["update", "-g", PACKAGE],
			};
		}

		if (PM_PATH_PATTERNS.npm.some((pattern) => normalizedPath.includes(pattern))) {
			return {
				name: "npm",
				command: "npm",
				args: ["install", "-g", `${PACKAGE}@latest`],
			};
		}

		return null;
	} catch (error) {
		console.error("detectPackageManager error:", error);
		return null;
	}
}

/**
 * Check if a command is available in PATH
 */
async function isCommandAvailable(command: string): Promise<boolean> {
	try {
		const isWindows = process.platform === "win32";
		const checkCmd = isWindows ? `where.exe ${command}` : `which ${command}`;
		await execAsync(checkCmd, {
			encoding: "utf-8",
			timeout: 10000,
		});
		return true;
	} catch {
		return false;
	}
}

/**
 * Compare two semver versions
 * Returns true if latest > current
 */
function isNewer(current: string, latest: string): boolean {
	const parseVersion = (v: string): number[] => {
		const match = v.match(/^(\d+)\.(\d+)\.(\d+)/);
		if (!match) return [0, 0, 0];
		return [parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10)];
	};

	// Handle non-standard current version
	if (current === "unknown" || !current.match(/^\d+\.\d+\.\d+/)) {
		return true; // Assume update needed if we can't determine current version
	}

	// Handle invalid latest version
	if (!latest || !latest.match(/^\d+\.\d+\.\d+/)) {
		return false; // Don't update to invalid version
	}

	const currentParts = parseVersion(current);
	const latestParts = parseVersion(latest);

	for (let i = 0; i < 3; i++) {
		if (latestParts[i] > currentParts[i]) return true;
		if (latestParts[i] < currentParts[i]) return false;
	}

	return false;
}

/**
 * Get manual update instructions
 */
function getManualInstructions(): string {
	return `To update manually, run one of:

  npm install -g @mariozechner/pi-coding-agent@latest
  bun update -g @mariozechner/pi-coding-agent
  yarn global add @mariozechner/pi-coding-agent@latest
  pnpm update -g @mariozechner/pi-coding-agent@latest`;
}

/**
 * Perform the actual update using the detected package manager
 */
async function performUpdate(
	pkgManager: PackageManagerInfo,
	ctx: UpdateContext
): Promise<void> {
	// Step 1: Get versions
	ctx.ui.setStatus("pi-updater", "Checking for updates...");
	const [currentVersion, latestVersion] = await Promise.all([
		getCurrentVersion(),
		getLatestVersion(),
	]);
	ctx.ui.setStatus("pi-updater", undefined);

	if (!latestVersion) {
		ctx.ui.notify("Failed to fetch latest version. Please check your network connection.", "error");
		return;
	}

	// Step 2: Check if update is needed
	if (!isNewer(currentVersion, latestVersion)) {
		ctx.ui.notify(`Already on latest version (v${currentVersion})`, "info");
		return;
	}

	// Step 3: Confirm update
	const confirmed = await ctx.ui.confirm(
		"Update pi?",
		`Update pi from v${currentVersion} to v${latestVersion}?`
	);

	if (!confirmed) {
		ctx.ui.notify("Update cancelled", "info");
		return;
	}

	// Step 4: Run update
	ctx.ui.setStatus("pi-updater", `Updating to v${latestVersion}...`);

	const fullCommand = `${pkgManager.command} ${pkgManager.args.join(" ")}`;
	try {
		await execAsync(fullCommand, {
			encoding: "utf-8",
			timeout: 120000, // 2 minutes for slow connections
		});

		// Step 5: Verify update succeeded
		ctx.ui.setStatus("pi-updater", "Verifying update...");
		const newVersion = await getCurrentVersion();
		ctx.ui.setStatus("pi-updater", undefined);

		// Check if update was successful: version matches or is newer than expected
		const updateSuccess =
			newVersion !== "unknown" &&
			(newVersion === latestVersion || isNewer(currentVersion, newVersion));

		if (updateSuccess) {
			ctx.ui.notify(`Updated to v${newVersion}!\n\nRestart pi to use the new version.`, "success");
		} else {
			ctx.ui.notify(
				`Update command completed but version is still v${newVersion}.\n\n${getManualInstructions()}`,
				"warning"
			);
		}
	} catch (error) {
		ctx.ui.setStatus("pi-updater", undefined);

		const errorMessage = error instanceof Error ? error.message : String(error);
		ctx.ui.notify(
			`Update failed:\n  Command: ${fullCommand}\n  Error: ${errorMessage}\n\n${getManualInstructions()}`,
			"error"
		);
	}
}

export default function (pi: ExtensionAPI) {
	pi.registerCommand("update-pi", {
		description: "Update pi to the latest version",
		handler: async (_args, ctx) => {
			// Step 1: Detect package manager
			ctx.ui.setStatus("pi-updater", "Detecting package manager...");
			const pkgManager = await detectPackageManager();

			// If detection failed, check if npm is available as fallback
			if (!pkgManager) {
				ctx.ui.setStatus("pi-updater", "Checking for npm...");
				if (await isCommandAvailable("npm")) {
					const useNpm = await ctx.ui.confirm(
						"Could not detect package manager",
						"Use npm to update? (Recommended)"
					);
					if (!useNpm) {
						ctx.ui.setStatus("pi-updater", undefined);
						ctx.ui.notify("Update cancelled.\n\n" + getManualInstructions(), "info");
						return;
					}
					// Use npm as fallback
					const fallbackManager: PackageManagerInfo = {
						name: "npm",
						command: "npm",
						args: ["install", "-g", `${PACKAGE}@latest`],
					};
					await performUpdate(fallbackManager, ctx);
					return;
				}

				ctx.ui.setStatus("pi-updater", undefined);
				ctx.ui.notify("Could not detect how pi was installed.\n\n" + getManualInstructions(), "warning");
				return;
			}

			await performUpdate(pkgManager, ctx);
		},
	});
}


