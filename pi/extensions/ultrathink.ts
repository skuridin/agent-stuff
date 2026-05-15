import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const ULTRATHINK_RE = /ultrathink/i;

export default function ultrathinkExtension(pi: ExtensionAPI) {
	let ultrathinkNext = false;
	let restoreThinkingLevel: ReturnType<ExtensionAPI["getThinkingLevel"]> | undefined;

	pi.on("session_start", async () => {
		ultrathinkNext = false;
		restoreThinkingLevel = undefined;
	});

	pi.on("input", async (event) => {
		if (event.source === "extension") return;

		ultrathinkNext = ULTRATHINK_RE.test(event.text);
	});

	pi.on("before_agent_start", async () => {
		// Clean up stale state from an interrupted turn
		if (restoreThinkingLevel !== undefined) {
			pi.setThinkingLevel(restoreThinkingLevel);
			restoreThinkingLevel = undefined;
		}

		const ultrathinkRequested = ultrathinkNext;
		ultrathinkNext = false;
		if (!ultrathinkRequested) {
			return;
		}

		restoreThinkingLevel = pi.getThinkingLevel();
		pi.setThinkingLevel("xhigh");
	});

	pi.on("agent_end", async () => {
		if (restoreThinkingLevel !== undefined) {
			pi.setThinkingLevel(restoreThinkingLevel);
			restoreThinkingLevel = undefined;
		}
	});

	pi.on("session_shutdown", async () => {
		if (restoreThinkingLevel !== undefined) {
			pi.setThinkingLevel(restoreThinkingLevel);
			restoreThinkingLevel = undefined;
		}
	});
}
