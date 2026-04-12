import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

const WIDGET_KEY = "elapsed-time";

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function (pi: ExtensionAPI) {
  let startTime: number | null = null;
  let accumulatedTime = 0;
  let ctx: import("@mariozechner/pi-coding-agent").ExtensionContext | null = null;

  // Update widget helper
  const updateWidget = (elapsed: number, isDone = false) => {
    if (!ctx) return;
    const theme = ctx.ui.theme;
    const timeStr = formatTime(elapsed);
    const label = isDone ? "Done in " : "";
    const text = `⏱ ${label}${timeStr}\n`;
    ctx.ui.setWidget(WIDGET_KEY, [theme.fg("muted", text)], { placement: "aboveEditor" });
  };

  // Track elapsed time from first turn
  pi.on("turn_start", (_, extensionCtx) => {
    ctx = extensionCtx;
    if (startTime === null) {
      startTime = Date.now();
      accumulatedTime = 0;
    }
  });

  // Track elapsed time on each turn end (don't show until agent ends)
  pi.on("turn_end", () => {
    if (startTime !== null) {
      accumulatedTime = Date.now() - startTime;
    }
  });

  // Show elapsed time only when agent ends
  pi.on("agent_end", () => {
    if (startTime !== null && accumulatedTime >= 1000) {
      updateWidget(accumulatedTime, true);
    }
    // Reset for next task
    startTime = null;
    accumulatedTime = 0;
  });


}
