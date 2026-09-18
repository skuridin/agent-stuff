# Jev thinking router

A dependency-free Pi extension that recommends or adjusts thinking effort without switching the coding model.

## Use

Set `TYPESAFE_API_KEY` in the environment that launches Pi. In an existing session, run `/reload` to discover this extension.

- `/jev-thinking` — show mode, latest status, and whether a key is configured; never displays the key.
- `/jev-thinking suggest` — recommend effort in the footer without changing it. This is the default for new sessions.
- `/jev-thinking auto` — apply confident recommendations on subsequent idle user prompts; use `medium` when Jev is uncertain.
- `/jev-thinking off` — stop requests to TypeSafe; keep the current thinking level.

Mode is saved in the session branch and restored on reload, resume, and tree navigation. Manual model or thinking changes disable automatic routing; use `/jev-thinking auto` to re-enable it. Changes from other extensions are also treated as overrides.

Pi clamps requested thinking levels to the current model's capabilities. The footer displays the actual level in auto mode. Nothing changes the global model or thinking defaults.

## Behavior and privacy

The extension evaluates one Choice question using pinned model `jev-1.13.0`: `low`, `medium`, `high`, or `unclear`. Recommendations require confidence of at least `0.8`. In auto mode, `unclear` or lower-confidence answers select the `medium` fallback instead of retaining the previous level, whether that level was low or high. Suggestion mode never changes thinking. This is an initial conservative threshold, not a measured success guarantee; start with suggestions and evaluate on your own work.

Each request sends the raw prompt and up to four recent user/assistant text messages from the active context to TypeSafe. It does not send system instructions, thinking blocks, tool arguments, tool output, or image data. User and assistant text can still contain sensitive information; turn routing off before sensitive work. Recent image-bearing messages are marked as such so Jev knows it has not seen those images.

Routing is skipped for current image attachments, non-reasoning models, missing keys, context over 16,000 characters, extension-generated input, and input received while the agent is running. Recent history is intentionally limited; missing older context should lead to `unclear` rather than a guess. Skills and templates have not yet been expanded at this hook.

The HTTP request has a two-second timeout and no retries. Network/API errors and invalid responses still leave the current thinking level unchanged; the fallback applies only to valid but uncertain answers. Mode changes, manual overrides, and session shutdown cancel an in-flight request. A stale response cannot overwrite a newer selection.

Successful evaluations are recorded as `jev-thinking-result` custom session entries containing the pinned Jev model, mode, choice, confidence, before/after levels, and elapsed milliseconds. These entries contain no prompts or credentials and are not added to the coding model's context. TypeSafe usage is not included in Pi's built-in token/cost totals.

`MODEL`, `MIN_CONFIDENCE`, `FALLBACK_LEVEL`, `TIMEOUT_MS`, and `MAX_STATE_CHARS` are near the top of `index.ts`. Use `/reload` after editing them.

## Check

With Node.js 24:

```sh
node ~/.pi/agent/extensions/jev-thinking/test.mjs
```

The check uses a fake key and mocked HTTP responses; it makes no API calls. It covers suggestions, automatic changes, uncertain/invalid responses, skips, timeouts, manual overrides, reload persistence, clamping, deferred thinking events, and stale-response cancellation.
