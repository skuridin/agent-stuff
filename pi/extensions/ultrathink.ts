import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

type ThinkingLevel = "off" | "minimal" | "low" | "medium" | "high" | "xhigh";

const ULTRATHINK_RE = /ultrathink/i;

export default function ultrathinkExtension(pi: ExtensionAPI) {
	const pendingUltrathinkTurns: boolean[] = [];
	let restoreThinkingLevel: ThinkingLevel | undefined;

	pi.on("session_start", async () => {
		pendingUltrathinkTurns.length = 0;
		restoreThinkingLevel = undefined;
	});

	pi.on("input", async (event) => {
		if (event.source === "extension") {
			return { action: "continue" };
		}

		pendingUltrathinkTurns.push(ULTRATHINK_RE.test(event.text));
		return { action: "continue" };
	});

	pi.on("before_agent_start", async () => {
		const ultrathinkRequested = pendingUltrathinkTurns.shift() ?? false;
		if (!ultrathinkRequested) {
			return;
		}

		restoreThinkingLevel = pi.getThinkingLevel() as ThinkingLevel;
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

		pendingUltrathinkTurns.length = 0;
	});
}
