import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import {
	DEFAULT_MAX_BYTES,
	DEFAULT_MAX_LINES,
	formatSize,
	type TruncationResult,
	truncateHead,
} from "@mariozechner/pi-coding-agent";
import { Text } from "@mariozechner/pi-tui";
import { type Static, Type } from "@sinclair/typebox";
import { createHash } from "node:crypto";
import * as os from "node:os";
import { readFile, writeFile, stat } from "node:fs/promises";
import pathModule from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

// Constants for safety limits
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const BINARY_EXTENSIONS = new Set([
	'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.ico', '.svg', '.webp',
	'.pdf', '.zip', '.tar', '.gz', '.rar', '.7z',
	'.exe', '.dll', '.so', '.dylib', '.bin',
	'.mp3', '.mp4', '.wav', '.ogg', '.flac', '.avi', '.mov',
	'.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
]);

/**
 * Check if a file is likely binary based on extension
 */
function isLikelyBinary(filePath: string): boolean {
	const ext = pathModule.extname(filePath).toLowerCase();
	return BINARY_EXTENSIONS.has(ext);
}

/**
 * Validate file is safe to read (size and binary check)
 */
async function validateFileForReading(filePath: string): Promise<void> {
	const stats = await stat(filePath);

	// Check file size
	if (stats.size > MAX_FILE_SIZE) {
		throw new Error(
			`File too large (${formatSize(stats.size)} > ${formatSize(MAX_FILE_SIZE)} limit)`,
		);
	}

	// Check if likely binary
	if (isLikelyBinary(filePath)) {
		throw new Error(
			`File appears to be binary (${pathModule.extname(filePath)}). hashline-tools only supports text files.`,
		);
	}
}

/**
 * Generate a hash for a line content (6 hex chars, content-only)
 * Does NOT include line number so hashes are stable across edits that shift lines
 * 6 hex chars = 16^6 = 16,777,216 possible values (very low collision probability)
 */
function generateLineHash(content: string, _lineNumber: number): string {
	const hash = createHash("md5").update(content).digest("hex");
	return hash.substring(0, 6); // 6 character hash
}

/**
 * Convert absolute path to tilde notation if it's in home directory
 */
function shortenPath(path: string): string {
	const home = os.homedir();
	if (path.startsWith(home)) {
		return `~${path.slice(home.length)}`;
	}
	return path;
}

/**
 * Resolve a line hash reference, with fallback for stale line numbers
 * Tries exact match, then nearby search, then global search
 * Throws if ambiguous (multiple matches)
 */
function resolveLineHash(
	ref: { lineNumber: number; hash: string },
	lines: string[],
	hashIndex: Map<number, string>,
	modifiedLines: Set<number>,
): { lineNumber: number } {
	const { lineNumber, hash } = ref;

	// Try exact match first (current behavior)
	const exactHash = hashIndex.get(lineNumber);
	if (exactHash === hash) {
		return { lineNumber };
	}

	// If exact match fails and this is a line we modified in this batch, it's expected
	if (modifiedLines.has(lineNumber)) {
		return { lineNumber };
	}

	// Fallback 1: search nearby lines by hash (±10 lines)
	const nearbyRange = 10;
	const nearbyCandidates: number[] = [];

	const nearbyStart = Math.max(1, lineNumber - nearbyRange);
	const nearbyEnd = Math.min(lines.length, lineNumber + nearbyRange);

	for (let i = nearbyStart; i <= nearbyEnd; i++) {
		if (hashIndex.get(i) === hash) {
			nearbyCandidates.push(i);
		}
	}

	if (nearbyCandidates.length === 1) {
		// Single nearby match - use it
		return { lineNumber: nearbyCandidates[0] };
	}

	if (nearbyCandidates.length > 1) {
		throw new Error(
			`Ambiguous reference for line ${lineNumber} (${hash}). Found ${nearbyCandidates.length} nearby candidates at lines: ${nearbyCandidates.join(", ")}. Please provide more context or read the file again.`,
		);
	}

	// Fallback 2: global search by hash (catches large line shifts from earlier edits)
	const globalCandidates: number[] = [];

	for (let i = 1; i <= lines.length; i++) {
		if (hashIndex.get(i) === hash) {
			globalCandidates.push(i);
		}
	}

	if (globalCandidates.length === 1) {
		// Single global match - line shifted significantly but content matches
		return { lineNumber: globalCandidates[0] };
	}

	if (globalCandidates.length > 1) {
		throw new Error(
			`Ambiguous reference for line ${lineNumber} (${hash}). Found ${globalCandidates.length} global matches at lines: ${globalCandidates.join(", ")}. Multiple lines have identical content. Please provide more context or read the file again.`,
		);
	}

	// No matches anywhere - line deleted or file changed
	throw new Error(
		`Hash not found for line ${lineNumber} (${hash}). The line may have been deleted or the file may have been modified. Try reading the file again.`,
	);
}

/**
 * Parse a line hash reference like "2:a3b4c5" into { lineNumber, hash }
 */
function parseLineHash(ref: string): { lineNumber: number; hash: string } | null {
	const match = ref.match(/^(\d+):([a-f0-9]{6})$/i);
	if (!match) return null;
	return { lineNumber: parseInt(match[1], 10), hash: match[2] };
}

export default function (pi: ExtensionAPI) {
	// Global state (loaded from config file)
	let hashlineEnabled = false;

	/**
	 * Load config file synchronously at extension initialization
	 */
	const loadConfig = async () => {
		const __filename = fileURLToPath(import.meta.url);
		const __dirname = dirname(__filename);
		const configPath = pathModule.join(__dirname, "hashline-config.json");
		try {
			const content = await readFile(configPath, "utf-8");
			const config = JSON.parse(content);
			hashlineEnabled = config.enabled ?? false;
		} catch (error) {
			// Config file doesn't exist or is invalid JSON, use default
			if (error instanceof SyntaxError) {
				console.error(`[hashline-tools] Invalid config file at ${configPath}, using default`);
			}
			hashlineEnabled = false;
		}
		return hashlineEnabled;
	};

	// Load config promise (initialized here, resolved before session starts)
	let configLoadPromise: Promise<boolean> | null = null;
	configLoadPromise = loadConfig().then(enabled => {
		// Update state once config is loaded
		hashlineEnabled = enabled;
		return enabled;
	}).catch(err => {
		console.error('[hashline-tools] Failed to load config:', err);
		return false;
	});

	/**
	 * Hashline Read Tool
	 * Reads a file with each line prefixed with a stable content hash
	 */
	const readHashlineSchema = Type.Object({
	path: Type.String({ description: "Path to the file to read (relative or absolute)" }),
	offset: Type.Optional(Type.Number({ description: "Line number to start reading from (1-indexed)" })),
	limit: Type.Optional(Type.Number({ description: "Maximum number of lines to read" })),
	aroundLine: Type.Optional(Type.Number({ description: "Read lines around this line (efficient alternative to full file reads)" })),
	radius: Type.Optional(Type.Number({ description: "Number of lines before and after aroundLine (default: 10). Smaller = more efficient." })),
});

	type ReadHashlineInput = Static<typeof readHashlineSchema>;

	pi.registerTool({
		name: "read_hashline",
		label: "Read (Hashline)",
		description: `Read the contents of a file with hashline identifiers. Each line is prefixed with 'lineNumber:hash|' (e.g., '1:a3b4c5|function hello() {'). Use these hash references with edit_hashline for stable edits that don't require reproducing whitespace or exact content. Output is truncated to ${DEFAULT_MAX_LINES} lines or ${formatSize(DEFAULT_MAX_BYTES)} (whichever is hit first). Prefer aroundLine/radius for targeted reads (more efficient). Use offset/limit for sequential ranges.`,
		parameters: readHashlineSchema,
		async execute(toolCallId, params, signal, onUpdate, ctx) {
			const { path, offset, limit, aroundLine, radius = 10 } = params;
			const absolutePath = pathModule.isAbsolute(path) ? path : pathModule.join(ctx.cwd, path);

			if (signal?.aborted) {
				throw new Error("Operation aborted");
			}

			// Validate file before reading (size and binary check)
			await validateFileForReading(absolutePath);

			const buffer = await readFile(absolutePath, "utf-8");
			const allLines = buffer.split("\n");

			// Apply offset (1-indexed to 0-indexed)
			// Handle aroundLine/radius mode (overrides offset/limit if specified)
			let startLine = 0;
			let endLine = allLines.length;

			if (aroundLine !== undefined) {
				const centerLine = aroundLine - 1; // 0-indexed
				startLine = Math.max(0, centerLine - radius);
				endLine = Math.min(allLines.length, centerLine + radius + 1);
			} else {
				// Apply offset (1-indexed to 0-indexed)
				startLine = offset ? Math.max(0, offset - 1) : 0;
				if (startLine >= allLines.length) {
					throw new Error(`Offset ${offset} is beyond end of file (${allLines.length} lines total)`);
				}

				// Apply limit if specified by user
				endLine = limit !== undefined ? Math.min(startLine + limit, allLines.length) : allLines.length;
			}

			const selectedLines = allLines.slice(startLine, endLine);

			// Add hashline prefixes
			const hashlineLines = selectedLines.map((line, idx) => {
				const lineNumber = startLine + idx + 1; // 1-indexed display
				const hash = generateLineHash(line, lineNumber);
				return `${lineNumber}:${hash}|${line}`;
			});

			let selectedContent = hashlineLines.join("\n");

			// Apply truncation using built-in utilities
			// Explicitly pass maxLines and maxBytes like the example
			const truncation = truncateHead(selectedContent, {
				maxLines: DEFAULT_MAX_LINES,
				maxBytes: DEFAULT_MAX_BYTES,
			});

			let outputText = truncation.content;

			// Add truncation notice if needed (in line with truncated-tool.ts example)
			if (truncation.truncated) {
				const truncatedLines = truncation.totalLines - truncation.outputLines;
				const truncatedBytes = truncation.totalBytes - truncation.outputBytes;

				outputText += `\n\n[Output truncated: showing ${truncation.outputLines} of ${truncation.totalLines} lines`;
				outputText += ` (${formatSize(truncation.outputBytes)} of ${formatSize(truncation.totalBytes)}).`;
				outputText += ` ${truncatedLines} lines (${formatSize(truncatedBytes)}) omitted.`;

				if (aroundLine !== undefined) {
					// For aroundLine mode, suggest expanding radius
					outputText += ` Use a larger radius to see more lines.]`;
				} else {
					outputText += ` Use offset=${startLine + truncation.outputLines + 1} to continue.]`;
				}
			} else if (aroundLine === undefined && limit !== undefined && endLine < allLines.length) {
				// User specified limit, there's more content, but no truncation
				const remaining = allLines.length - endLine;
				const nextOffset = endLine + 1;
				outputText += `\n\n[${remaining} more lines in file. Use offset=${nextOffset} to continue.]`;
			}

			return {
				content: [{ type: "text", text: outputText }],
				details: { totalLines: allLines.length, linesRead: truncation.outputLines, truncation },
			};
		},

		renderCall(args, theme) {
			const rawPath = args.path;
			const path = shortenPath(pathModule.isAbsolute(rawPath) ? rawPath : pathModule.resolve(process.cwd(), rawPath));
			const offset = args.offset;
			const limit = args.limit;

			let pathDisplay = theme.fg("accent", path);
			if (offset !== undefined || limit !== undefined) {
				const startLine = offset ?? 1;
				const endLine = limit !== undefined ? startLine + limit - 1 : "";
				pathDisplay += theme.fg("warning", `:${startLine}${endLine ? `-${endLine}` : ""}`);
			}

			return new Text(`${theme.fg("toolTitle", theme.bold("read_hashline"))} ${pathDisplay}`, 0, 0);
		},

		renderResult(result, { expanded, isPartial }, theme) {
			if (isPartial) {
				return new Text(theme.fg("warning", "Reading..."), 0, 0);
			}

			const details = result.details as { totalLines?: number; linesRead?: number; truncation?: TruncationResult } | undefined;
			const content = result.content[0];

			if (content?.type !== "text") {
				return new Text("", 0, 0);
			}

			const lines = content.text.split("\n");
			const maxLines = expanded ? lines.length : 10;
			const displayLines = lines.slice(0, maxLines);
			const remaining = lines.length - maxLines;

			let text = displayLines.map((line) => theme.fg("toolOutput", line)).join("\n");
			if (remaining > 0) {
				text += `${theme.fg("muted", `\n... (${remaining} more lines,`)}`;
			}

			// Show truncation warning
			if (details?.truncation?.truncated) {
				if (details.truncation.truncatedBy === "lines") {
					text +=
						"\n" +
						theme.fg(
							"warning",
							`[Truncated: showing ${details.truncation.outputLines} of ${details.truncation.totalLines} lines (${details.truncation.maxLines ?? DEFAULT_MAX_LINES} line limit)]`,
						);
				} else {
					text +=
						"\n" +
						theme.fg(
							"warning",
							`[Truncated: ${details.truncation.outputLines} lines shown (${formatSize(details.truncation.maxBytes ?? DEFAULT_MAX_BYTES)} limit)]`,
						);
				}
			}

			return new Text(text, 0, 0);
		},
	});

	/**
	 * Hashline Edit Tool
	 * Edits files using hashline references for stable, whitespace-independent edits
	 */
	const editHashlineSchema = Type.Object({
		path: Type.String({ description: "Path to the file to edit (relative or absolute)" }),
		edits: Type.Array(
			Type.Union([
				// Replace single line
				Type.Object({
					type: Type.Literal("replace_line"),
					lineHash: Type.String({
						description: "Line hash identifier from read_hashline output (e.g., '2:a3b4c5')",
					}),
					newText: Type.String({ description: "New content for this line" }),
				}),
				// Replace range of lines
				Type.Object({
					type: Type.Literal("replace_range"),
					startHash: Type.String({ description: "Starting line hash (e.g., '1:a3b4c5')" }),
					endHash: Type.String({ description: "Ending line hash (e.g., '3:d4e5f6')" }),
					newLines: Type.Array(Type.String({ description: "New lines to replace the range" })),
				}),
				// Insert after a line
				Type.Object({
					type: Type.Literal("insert_after"),
					lineHash: Type.String({ description: "Line hash to insert after (e.g., '3:c4d4e6')" }),
					newLines: Type.Array(Type.String({ description: "New lines to insert" })),
				}),
				// Delete a line
				Type.Object({
					type: Type.Literal("delete_line"),
					lineHash: Type.String({ description: "Line hash identifier (e.g., '2:a3b4c5')" }),
				}),
				// Delete range of lines
				Type.Object({
					type: Type.Literal("delete_range"),
					startHash: Type.String({ description: "Starting line hash" }),
					endHash: Type.String({ description: "Ending line hash" }),
				}),
			]),
			{ description: "Edit operations to apply in order" },
		),
		responseMode: Type.Optional(
			Type.Union([
				Type.Literal("minimal"),
				Type.Literal("normal"),
				Type.Literal("debug"),
			]),
			{ description: "Output verbosity (default: minimal). Minimal: no context, most efficient. Normal: ±1 context. Debug: ±3 context for troubleshooting." },
		),
	});

	type EditHashlineInput = Static<typeof editHashlineSchema>;

pi.registerTool({
		name: "edit_hashline",
		label: "Edit (Hashline)",
		description: "Edit a file using hashline references from read_hashline. This provides stable, whitespace-independent edits that don't require reproducing exact content. Supports: replace_line, replace_range, insert_after, delete_line, delete_range. Default responseMode: minimal (no context). Use normal for ±1 context, debug for ±3 context (only when needed).",
		parameters: editHashlineSchema,
		async execute(toolCallId, params, signal, onUpdate, ctx) {
			const { path, edits, responseMode = "minimal" } = params;
			const absolutePath = pathModule.isAbsolute(path) ? path : pathModule.join(ctx.cwd, path);

			if (signal?.aborted) {
				throw new Error("Operation aborted");
			}

			// Validate file before reading (size and binary check)
			await validateFileForReading(absolutePath);

			// Read the current file
			const buffer = await readFile(absolutePath, "utf-8");
			let lines = buffer.split("\n");


			// Rebuild hash index from current file state
			const hashIndex = new Map<number, string>();
			for (let i = 0; i < lines.length; i++) {
				const lineNumber = i + 1;
				const hash = generateLineHash(lines[i], lineNumber);
				hashIndex.set(lineNumber, hash);
			}

			// Track which lines have been modified and the affected range
			const modifiedLines = new Set<number>();
			let minAffectedLine = Infinity;
			let maxAffectedLine = -Infinity;

			// Apply edits in order
			for (const edit of edits) {
				if (signal?.aborted) {
					throw new Error("Operation aborted");
				}

				switch (edit.type) {
					case "replace_line": {
						const ref = parseLineHash(edit.lineHash);
						if (!ref) {
							throw new Error(`Invalid line hash format: ${edit.lineHash}`);
						}

						// Resolve line hash (with fallback for stale line numbers)
						const resolved = resolveLineHash(ref, lines, hashIndex, modifiedLines);
						const lineNumber = resolved.lineNumber;

						if (lineNumber < 1 || lineNumber > lines.length) {
							throw new Error(`Line number ${lineNumber} out of range (1-${lines.length})`);
						}

						// Replace the line
						lines[lineNumber - 1] = edit.newText;
						modifiedLines.add(lineNumber);

						// Track affected range
						minAffectedLine = Math.min(minAffectedLine, lineNumber);
						maxAffectedLine = Math.max(maxAffectedLine, lineNumber);

						// Update hash index for subsequent edits
						hashIndex.set(lineNumber, generateLineHash(edit.newText, lineNumber));
						break;
					}

					case "replace_range": {
						const startRef = parseLineHash(edit.startHash);
						const endRef = parseLineHash(edit.endHash);
						if (!startRef || !endRef) {
							throw new Error(`Invalid line hash format`);
						}

						// Resolve line hashes (with fallback for stale line numbers)
						const resolvedStart = resolveLineHash(startRef, lines, hashIndex, modifiedLines);
						const resolvedEnd = resolveLineHash(endRef, lines, hashIndex, modifiedLines);

						if (resolvedStart.lineNumber < 1 || resolvedStart.lineNumber > lines.length) {
							throw new Error(`Start line number out of range`);
						}
						if (
							resolvedEnd.lineNumber < resolvedStart.lineNumber ||
							resolvedEnd.lineNumber > lines.length
						) {
							throw new Error(`End line number out of range or before start`);
						}

						// Verify hashes for all lines in range
						for (let i = resolvedStart.lineNumber; i <= resolvedEnd.lineNumber; i++) {
							if (modifiedLines.has(i)) continue;
							const actualHash = generateLineHash(lines[i - 1], i);
							if (actualHash !== hashIndex.get(i)) {
								throw new Error(
									`Hash mismatch for line ${i}. File may have been modified since read_hashline was called.`,
								);
							}
						}

						// Replace the range
						const before = lines.slice(0, resolvedStart.lineNumber - 1);
						const after = lines.slice(resolvedEnd.lineNumber);
						lines = [...before, ...edit.newLines, ...after];

						// Track affected range (from start to end of new content)
						minAffectedLine = Math.min(minAffectedLine, resolvedStart.lineNumber);
						maxAffectedLine = Math.max(
							maxAffectedLine,
							resolvedStart.lineNumber + edit.newLines.length,
						);

						// Update hash index for remaining operations
						// Note: after replacement, line numbers change, so we need to rebuild
						for (let i = 0; i < lines.length; i++) {
							hashIndex.set(i + 1, generateLineHash(lines[i], i + 1));
						}
						modifiedLines.clear();
						break;
					}

					case "insert_after": {
						const ref = parseLineHash(edit.lineHash);
						if (!ref) {
							throw new Error(`Invalid line hash format: ${edit.lineHash}`);
						}

						// Resolve line hash (with fallback for stale line numbers)
						const resolved = resolveLineHash(ref, lines, hashIndex, modifiedLines);
						const lineNumber = resolved.lineNumber;

						if (lineNumber < 1 || lineNumber > lines.length) {
							throw new Error(`Line number out of range (1-${lines.length})`);
						}

						// Insert new lines
						const before = lines.slice(0, lineNumber);
						const after = lines.slice(lineNumber);
						lines = [...before, ...edit.newLines, ...after];

						// Track affected range (insertion point + new lines + some context after)
						minAffectedLine = Math.min(minAffectedLine, lineNumber + 1);
						maxAffectedLine = Math.max(maxAffectedLine, lineNumber + edit.newLines.length);

						// Rebuild hash index
						for (let i = 0; i < lines.length; i++) {
							hashIndex.set(i + 1, generateLineHash(lines[i], i + 1));
						}
						modifiedLines.clear();
						break;
					}

					case "delete_line": {
						const ref = parseLineHash(edit.lineHash);
						if (!ref) {
							throw new Error(`Invalid line hash format: ${edit.lineHash}`);
						}

						// Resolve line hash (with fallback for stale line numbers)
						const resolved = resolveLineHash(ref, lines, hashIndex, modifiedLines);
						const lineNumber = resolved.lineNumber;

						if (lineNumber < 1 || lineNumber > lines.length) {
							throw new Error(`Line number out of range (1-${lines.length})`);
						}

						// Delete the line
						lines.splice(lineNumber - 1, 1);

						// Track affected range (deleted position + a few lines after since line numbers shifted)
						minAffectedLine = Math.min(minAffectedLine, lineNumber);
						maxAffectedLine = Math.max(maxAffectedLine, lineNumber + 5);

						// Rebuild hash index
						for (let i = 0; i < lines.length; i++) {
							hashIndex.set(i + 1, generateLineHash(lines[i], i + 1));
						}
						modifiedLines.clear();
						break;
					}

					case "delete_range": {
						const startRef = parseLineHash(edit.startHash);
						const endRef = parseLineHash(edit.endHash);
						if (!startRef || !endRef) {
							throw new Error(`Invalid line hash format`);
						}

						// Resolve line hashes (with fallback for stale line numbers)
						const resolvedStart = resolveLineHash(startRef, lines, hashIndex, modifiedLines);
						const resolvedEnd = resolveLineHash(endRef, lines, hashIndex, modifiedLines);

						if (resolvedStart.lineNumber < 1 || resolvedStart.lineNumber > lines.length) {
							throw new Error(`Start line number out of range`);
						}
						if (
							resolvedEnd.lineNumber < resolvedStart.lineNumber ||
							resolvedEnd.lineNumber > lines.length
						) {
							throw new Error(`End line number out of range or before start`);
						}

						// Verify hashes
						for (let i = resolvedStart.lineNumber; i <= resolvedEnd.lineNumber; i++) {
							if (modifiedLines.has(i)) continue;
							const actualHash = generateLineHash(lines[i - 1], i);
							if (actualHash !== hashIndex.get(i)) {
								throw new Error(
									`Hash mismatch for line ${i}. File may have been modified.`,
								);
							}
						}

						// Delete the range
						lines.splice(
							resolvedStart.lineNumber - 1,
							resolvedEnd.lineNumber - resolvedStart.lineNumber + 1,
						);

						// Track affected range (deleted position + a few lines after since line numbers shifted)
						minAffectedLine = Math.min(minAffectedLine, resolvedStart.lineNumber);
						maxAffectedLine = Math.max(maxAffectedLine, resolvedStart.lineNumber + 5);

						// Rebuild hash index
						for (let i = 0; i < lines.length; i++) {
							hashIndex.set(i + 1, generateLineHash(lines[i], i + 1));
						}
						modifiedLines.clear();
						break;
					}
				}
			}

			// Write the modified content
			const newContent = lines.join("\n");
			await writeFile(absolutePath, newContent, "utf-8");


			// Generate affected region output for model to use in subsequent edits
			let resultMessage: string;
			let affectedRegion: string | undefined;
			
			// If edits were made, include affected region with updated hashes
			if (minAffectedLine !== Infinity && maxAffectedLine !== -Infinity) {
				// Determine context based on responseMode
				const contextLines =
					responseMode === "minimal" ? 0 : responseMode === "normal" ? 1 : 3;
				
				const regionStart = Math.max(0, minAffectedLine - 1 - contextLines);
				const regionEnd = Math.min(lines.length, maxAffectedLine + contextLines);
				
				// Generate hashline output for the region
				const regionLines: string[] = [];
				
				for (let i = regionStart; i < regionEnd; i++) {
					const lineNumber = i + 1;
					const hash = generateLineHash(lines[i], lineNumber);
					const isChanged = i >= minAffectedLine - 1 && i < maxAffectedLine;
					const marker = isChanged ? "*" : " ";
					
					// Only show hash for changed lines; unchanged lines just show line number for context
					if (isChanged) {
						regionLines.push(`${marker}${lineNumber}:${hash}|${lines[i]}`);
					} else {
						regionLines.push(`${marker}${lineNumber}|${lines[i]}`);
					}
				}
				
				resultMessage = `Applied ${edits.length} edit(s) to ${path}:\n${regionLines.join("\n")}`;
				affectedRegion = regionLines.join("\n");
			} else {
				resultMessage = `Applied ${edits.length} edit(s) to ${path}.`;
			}
			
			return {
				content: [{ type: "text", text: resultMessage }],
				details: {
					editsApplied: edits.length,
					path,
					responseMode,
					affectedRegion,
				},
			};
		},

		renderCall(args, theme) {
			const rawPath = args.path;
			const path = shortenPath(pathModule.isAbsolute(rawPath) ? rawPath : pathModule.resolve(process.cwd(), rawPath));
			return new Text(`${theme.fg("toolTitle", theme.bold("edit_hashline"))} ${theme.fg("accent", path)}`, 0, 0);
		},

		renderResult(result, { isPartial, expanded }, theme) {
			if (isPartial) {
				return new Text(theme.fg("warning", "Applying edits..."), 0, 0);
			}

			const details = result.details as {
				editsApplied?: number;
				path?: string;
				affectedRegion?: string;
			} | undefined;
			const edits = details?.editsApplied ?? 0;
			const noun = edits === 1 ? "edit" : "edits";

			let text = `${theme.fg("success", `Successfully applied ${edits} ${noun}`)}`;

			// Show affected region if available (both collapsed and expanded)
			if (details?.affectedRegion) {
				const regionLines = details.affectedRegion.split("\n");
				const maxLines = expanded ? 20 : 10;
				const displayLines = regionLines.slice(0, maxLines);
				const remaining = regionLines.length - maxLines;

				text += "\n\n" + displayLines.map((line) => {
					if (line.startsWith("*")) {
						return theme.fg("toolDiffAdded", line);
					} else {
						return theme.fg("toolDiffContext", line);
					}
				}).join("\n");
				if (remaining > 0) {
					const hint = expanded ? "scroll" : "press e to expand";
					text += `\n${theme.fg("muted", `... (${remaining} more lines, ${hint})`)}`;
				}
			}

			return new Text(text, 0, 0);
		},
	});

	// Set initial status on session start
	pi.on("session_start", async (_event, ctx) => {
		if (configLoadPromise) {
			await configLoadPromise;
		}
		ctx.ui.setStatus(
			"hashline",
			hashlineEnabled ? "[H:ON]" : "[H:OFF]",
		);
	});

	// /hashline command
	pi.registerCommand("hashline", {
		description: "Toggle hashline mode (uses hashline tools vs default tools)",
		handler: async (_args, ctx) => {
			hashlineEnabled = !hashlineEnabled;

			// Write to config file (static location: extension directory)
			const __filename = fileURLToPath(import.meta.url);
			const __dirname = dirname(__filename);
			const configPath = pathModule.join(__dirname, "hashline-config.json");
			await writeFile(configPath, JSON.stringify({ enabled: hashlineEnabled }, null, 2), "utf-8");

			ctx.ui.notify(`Hashline mode: ${hashlineEnabled ? "ENABLED" : "DISABLED"}`, "info");
			ctx.ui.setStatus("hashline", hashlineEnabled ? "[H:ON]" : "[H:OFF]");
		},
	});

	// Update system prompt based on enabled state
	pi.on("before_agent_start", async (event, ctx) => {
		if (hashlineEnabled) {
			return {
				systemPrompt: event.systemPrompt + "\n\nHashline tools (read_hashline, edit_hashline) are available. They provide stable line references via content hashes, which is useful when file content may shift during edits. Use them when appropriate, but default tools work fine too.",
			};
		} else {
			return {
				systemPrompt: event.systemPrompt + "\n\nDo not use hashline tools.",
			};
		}
	});

	// Clear status on shutdown
	pi.on("session_shutdown", async (_event, ctx) => {
		ctx.ui.setStatus("hashline", undefined);
	});
}
