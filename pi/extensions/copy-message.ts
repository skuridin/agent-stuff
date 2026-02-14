import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { copyToClipboard } from "@mariozechner/pi-coding-agent";

interface MessageItem {
	index: number;
	preview: string;
	fullText: string;
}

function truncate(str: string, maxLen: number): string {
	if (str.length <= maxLen) return str;
	return str.slice(0, maxLen - 3) + "...";
}

export default function (pi: ExtensionAPI) {
	pi.registerCommand("copymsg", {
		description: "Copy an assistant message to clipboard (select from recent)",
		handler: async (_args, ctx) => {
			// Get all entries and find assistant messages
			const entries = ctx.sessionManager.getEntries();
			const assistantMessages: MessageItem[] = [];

			// Iterate in reverse to get most recent first
			for (let i = entries.length - 1; i >= 0 && assistantMessages.length < 5; i--) {
				const entry = entries[i];
				if (entry.type !== "message" || entry.message.role !== "assistant") continue;

				// Skip empty/aborted messages
				if (entry.message.stopReason === "aborted" && entry.message.content.length === 0) {
					continue;
				}

				// Extract text content
				let fullText = "";
				for (const content of entry.message.content) {
					if (content.type === "text") {
						fullText += content.text;
					}
				}

				const trimmed = fullText.trim();
				if (!trimmed) continue;

				// Create preview: first line, truncated
				const firstLine = trimmed.split(/\n/)[0] ?? "";
				const preview = truncate(firstLine.replace(/\s+/g, " "), 60);

				assistantMessages.push({
					index: assistantMessages.length + 1,
					preview,
					fullText: trimmed,
				});
			}

			if (assistantMessages.length === 0) {
				ctx.ui.notify("No assistant messages to copy", "error");
				return;
			}

			// Build options for selector
			const options = assistantMessages.map((m) => `${m.index}. ${m.preview}`);

			// Show selector
			const selected = await ctx.ui.select("Select message to copy:", options);
			if (!selected) {
				return; // User cancelled
			}

			// Find the selected message
			const selectedIndex = parseInt(selected.split(".")[0]!, 10);
			const message = assistantMessages.find((m) => m.index === selectedIndex);

			if (!message) {
				ctx.ui.notify("Selection error", "error");
				return;
			}

			// Copy to clipboard
			try {
				copyToClipboard(message.fullText);
				ctx.ui.notify(`Copied message #${message.index} to clipboard`, "success");
			} catch (err) {
				ctx.ui.notify(`Failed to copy: ${err}`, "error");
			}
		},
	});
}
