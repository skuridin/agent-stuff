import assert from "node:assert/strict";
import extension from "./index.ts";

process.env.TYPESAFE_API_KEY = "test-key";

function harness() {
  const handlers = new Map();
  const entries = [];
  const changes = [];
  const deferred = [];
  let level = "medium";
  let command;
  let status = "";
  const ctx = {
    hasUI: true,
    model: { provider: "test", id: "coder", reasoning: true },
    isIdle: () => true,
    ui: { setStatus: (_name, text) => { status = text; }, notify: () => {} },
    sessionManager: { getBranch: () => entries, buildContextEntries: () => [] },
  };
  const emit = (type, event = {}) => handlers.get(type)?.({ type, ...event }, ctx);
  extension({
    on: (name, handler) => handlers.set(name, handler),
    registerCommand: (name, definition) => { assert.equal(name, "jev-thinking"); command = definition; },
    appendEntry: (customType, data) => entries.push({ type: "custom", customType, data }),
    getThinkingLevel: () => level,
    setThinkingLevel: (next) => {
      const previousLevel = level;
      level = ctx.clamp ?? next;
      changes.push(level);
      if (level !== previousLevel) deferred.push(() => emit("thinking_level_select", { previousLevel, level }));
    },
  });
  emit("session_start");
  return {
    ctx, entries, changes, emit,
    input: (text = "Fix a typo", extra = {}) => emit("input", { text, source: "interactive", ...extra }),
    mode: (next) => command.handler(next, ctx),
    flush: async () => { for (const event of deferred.splice(0)) await event(); },
    get status() { return status; },
  };
}

function reply(choice = "low", confidence = 0.95) {
  return Response.json({ answers: { effort: { type: "choice", choice, confidence } } });
}

const calls = [];
globalThis.fetch = async (url, options) => {
  calls.push({ url, ...options, body: JSON.parse(options.body) });
  return reply();
};
const h = harness();
const message = (role, text) => ({ role, content: [{ type: "text", text }] });
h.ctx.sessionManager.buildContextEntries = () => [
  { type: "compaction", summary: "Not sent to Jev" },
  { type: "message", message: message("user", "earlier question") },
  { type: "message", message: message("assistant", "earlier answer") },
  { type: "message", message: message("user", "context question") },
  { type: "message", message: { role: "assistant", content: [{ type: "thinking", thinking: "PRIVATE_THINKING" }, { type: "text", text: "context answer" }] } },
  { type: "message", message: message("toolResult", "PRIVATE_TOOL_OUTPUT") },
  { type: "message", message: message("user", "latest question") },
];
await h.input();
assert.deepEqual(h.changes, [], "suggest mode must not change thinking");
assert.match(h.status, /suggest low/);
assert.equal(calls[0].url, "https://api.typesafe.ai/v1/systemone");
assert.equal(calls[0].headers.Authorization, "Bearer test-key");
assert.equal(calls[0].redirect, "error");
assert.equal(calls[0].body.state.recent.length, 4);
assert.equal(calls[0].body.state.recent[0].text, "earlier answer");
assert.doesNotMatch(JSON.stringify(calls[0].body), /PRIVATE_|test-key/);
assert.doesNotMatch(JSON.stringify(h.entries), /context question|Fix a typo/);

await h.mode("auto");
await h.input();
await h.flush();
assert.deepEqual(h.changes, ["low"]);
assert.match(h.status, /auto low/, "deferred own thinking event must not disable auto");
globalThis.fetch = async () => reply("high");
await h.input("Investigate a race condition");
await h.flush();
assert.deepEqual(h.changes, ["low", "high"]);

for (const [choice, confidence] of [["unclear", 0.99], ["low", 0.3]]) {
  const uncertain = harness();
  await uncertain.mode("auto");
  globalThis.fetch = async () => reply("low");
  await uncertain.input();
  await uncertain.flush();
  globalThis.fetch = async () => reply(choice, confidence);
  await uncertain.input("What about the next task?");
  await uncertain.flush();
  assert.deepEqual(uncertain.changes, ["low", "medium"], "uncertainty must reset automatically selected low effort");
  assert.match(uncertain.status, /fallback medium/);
  assert.equal(uncertain.entries.at(-1).data.before, "low");
  assert.equal(uncertain.entries.at(-1).data.after, "medium");
  globalThis.fetch = async () => reply("high");
  await uncertain.input();
  await uncertain.flush();
  assert.deepEqual(uncertain.changes, ["low", "medium", "high"], "fallback must not disable automatic routing");
  await uncertain.mode("suggest");
  globalThis.fetch = async () => reply(choice, confidence);
  await uncertain.input();
  assert.equal(uncertain.changes.length, 3, "suggest mode must not apply the fallback");
  assert.match(uncertain.status, /unchanged/);
}
for (const response of [reply("max"), reply("low", 2), reply("low", "0.99"), Response.json(null), new Response("bad json"), new Response("secret error body", { status: 401 })]) {
  globalThis.fetch = async () => response;
  await h.input();
  assert.equal(h.changes.length, 2);
  assert.match(h.status, /unavailable; unchanged/);
  assert.doesNotMatch(h.status, /secret/);
}

globalThis.fetch = async () => { throw new Error("should not be called"); };
await h.mode("off");
await h.input();
assert.match(h.status, /off/);
await h.mode("auto");
delete process.env.TYPESAFE_API_KEY;
await h.input();
assert.match(h.status, /key missing/);
process.env.TYPESAFE_API_KEY = "test-key";
h.ctx.model.reasoning = false;
await h.input();
assert.match(h.status, /no thinking control/);
h.ctx.model.reasoning = true;
await h.input("explain this", { images: [{}] });
assert.match(h.status, /images; unchanged/);
await h.input("x".repeat(16001));
assert.match(h.status, /context too large/);
const previousStatus = h.status;
await h.input("continue", { source: "extension" });
await h.input("continue", { streamingBehavior: "steer" });
h.ctx.isIdle = () => false;
await h.input();
h.ctx.isIdle = () => true;
assert.equal(h.status, previousStatus);

await h.emit("thinking_level_select", { previousLevel: "high", level: "medium" });
assert.match(h.status, /off \(manual override\)/);
await h.emit("session_start");
assert.match(h.status, /off/, "mode must survive reload");
await h.mode("auto");
await h.emit("model_select", { source: "restore" });
assert.match(h.status, /auto/);
await h.emit("model_select", { source: "cycle" });
assert.match(h.status, /manual override/);

globalThis.fetch = async () => reply("low");
const clamped = harness();
clamped.ctx.clamp = "high";
await clamped.mode("auto");
await clamped.input();
await clamped.flush();
assert.match(clamped.status, /auto high/, "show actual clamped level and ignore our own event");
globalThis.fetch = async () => reply("unclear");
await clamped.input();
await clamped.flush();
assert.match(clamped.status, /fallback high/, "fallback must respect model capabilities");

for (const cancel of [async (h) => h.mode("off"), async (h) => h.emit("model_select", { source: "set" }), async (h) => h.emit("session_shutdown")]) {
  const stale = harness();
  await stale.mode("auto");
  let finish;
  let signal;
  globalThis.fetch = async (_url, options) => {
    signal = options.signal;
    return new Promise((resolve) => { finish = resolve; });
  };
  const running = stale.input();
  await cancel(stale);
  const statusAfterCancel = stale.status;
  assert.equal(signal.aborted, true);
  finish(reply("high"));
  await running;
  assert.deepEqual(stale.changes, [], "stale result must not change thinking");
  assert.equal(stale.status, statusAfterCancel);
}

const timed = harness();
await timed.mode("auto");
globalThis.fetch = async (_url, { signal }) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => resolve(reply()), 3000);
  signal.addEventListener("abort", () => { clearTimeout(timer); reject(signal.reason); }, { once: true });
});
await timed.input();
assert.match(timed.status, /timed out; unchanged/);
assert.deepEqual(timed.changes, []);
console.log("Jev thinking checks passed");
