/**
 * Context Gauge Extension
 *
 * Shows a progress bar in the footer indicating context usage towards 100k tokens.
 * The 100k threshold is a practical limit: beyond it, models tend to degrade regardless
 * of their actual context window size.
 *
 * Uses the "dim" theme color to match the default footer style.
 */

import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";

const CONTEXT_CEILING = 100_000;
const BAR_WIDTH = 20;

const BLOCK_FULL = "█";
const BLOCK_EMPTY = "░";

function formatTokens(n: number): string {
	if (n < 1_000) return `${n}`;
	return `${(n / 1_000).toFixed(1)}k`;
}

function updateGauge(ctx: ExtensionContext) {
	const theme = ctx.ui.theme;

	try {
		const usage = ctx.getContextUsage();
		const ceiling = usage ? Math.min(CONTEXT_CEILING, usage.contextWindow) : CONTEXT_CEILING;

		if (!usage || usage.tokens === null) {
			ctx.ui.setStatus("context-gauge", theme.fg("dim", `ctx ?/${formatTokens(ceiling)}`));
			return;
		}

		const tokens = usage.tokens;
		const ratio = Math.min(tokens / ceiling, 1);
		const percent = Math.round(ratio * 100);
		const filled = Math.round(ratio * BAR_WIDTH);
		const empty = BAR_WIDTH - filled;

		const bar = BLOCK_FULL.repeat(filled) + BLOCK_EMPTY.repeat(empty);
		const label = `${formatTokens(tokens)}/${formatTokens(ceiling)}`;
		const ceilingNote = ceiling < CONTEXT_CEILING ? " (model limit)" : "";

		ctx.ui.setStatus(
			"context-gauge",
			theme.fg("dim", `${bar} ${label}${ceilingNote}`),
		);
	} catch {
		ctx.ui.setStatus("context-gauge", theme.fg("dim", "ctx --"));
	}
}

export default function (pi: ExtensionAPI) {
	pi.on("session_start", async (_event, ctx) => {
		updateGauge(ctx);
	});

	pi.on("message_update", async (_event, ctx) => {
		updateGauge(ctx);
	});

	pi.on("turn_start", async (_event, ctx) => {
		updateGauge(ctx);
	});

	pi.on("turn_end", async (_event, ctx) => {
		updateGauge(ctx);
	});

	pi.on("agent_end", async (_event, ctx) => {
		updateGauge(ctx);
	});

	pi.on("session_compact", async (_event, ctx) => {
		updateGauge(ctx);
	});

	pi.on("model_select", async (_event, ctx) => {
		updateGauge(ctx);
	});
}
