/**
 * Turn Summary Extension
 *
 * Shows a post-agent-end widget above the editor with elapsed time
 * and final context usage in a single line:
 *   Done in 0:42 · Context: 12.3k/100k
 *
 * To add more info panels in the future, just append lines inside
 * showSummary() at the marked location.
 */

import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

const WIDGET_KEY = "turn-summary";
const CONTEXT_CEILING = 100_000;

// ── Formatting helpers ────────────────────────────────────────────

function formatTokens(n: number): string {
  if (n < 1_000) return `${n}`;
  return `${(n / 1_000).toFixed(1)}k`;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

// ── Extension factory ─────────────────────────────────────────────

export default function (pi: ExtensionAPI) {
  let startTime: number | null = null;
  let accumulatedTime = 0;

  // ── Turn summary widget (shown above editor after agent ends) ───

  function getSummaryLines(ctx: ExtensionContext): string[] {
    const theme = ctx.ui.theme;
    const parts: string[] = [];
    let isDumbZone = false;

    // Elapsed time
    if (startTime !== null && accumulatedTime >= 1000) {
      parts.push(`Done in ${formatTime(accumulatedTime)}`);
    }

    // Final context usage
    try {
      const usage = ctx.getContextUsage();
      if (usage && usage.tokens !== null) {
        const ceiling = Math.min(CONTEXT_CEILING, usage.contextWindow);
        const label = `${formatTokens(usage.tokens)}/${formatTokens(ceiling)}`;
        isDumbZone = usage.tokens > CONTEXT_CEILING;
        parts.push(`Context: ${label}`);
      }
    } catch {
      // skip context line if unavailable
    }

    // ── Future info panels: add more parts here ────────────────────

    if (parts.length === 0) return [];

    let line = theme.fg("dim", parts.join(" · "));
    if (isDumbZone) {
      line += ` ${theme.fg("error", "dumb zone")}`;
    }
    return [line];
  }

  // ── Lifecycle handlers ────────────────────────────────────────────

  pi.on("turn_start", async (_event, ctx) => {
    // Start elapsed timer on first turn of a new agent run
    if (startTime === null) {
      startTime = Date.now();
      accumulatedTime = 0;
      // Clear any stale widget from a previous run
      ctx.ui.setWidget(WIDGET_KEY, [], { placement: "aboveEditor" });
    }
  });

  pi.on("turn_end", async () => {
    // Accumulate elapsed wall-clock time
    if (startTime !== null) {
      accumulatedTime = Date.now() - startTime;
    }
  });

  pi.on("agent_end", async (_event, ctx) => {
    const lines = getSummaryLines(ctx);
    if (lines.length > 0) {
      ctx.ui.setWidget(WIDGET_KEY, lines, { placement: "aboveEditor" });
    }

    // Reset timer for next agent run
    startTime = null;
    accumulatedTime = 0;
  });
}
