---
name: frontend-instrumented-debugging
description: Use this skill when debugging hard JavaScript frontend bugs where runtime behavior is unclear, especially async flows, state gates, retries, effects, requests, or completion paths.
---

# Frontend Instrumented Debugging

When debugging hard frontend JavaScript bugs, observe runtime behavior before guessing. Add temporary gated instrumentation around async boundaries, state gates, retries, effects, requests, and finalization paths, using structured logs that avoid secrets and can be copied from a global array. Ask the user to reproduce and send JSON logs, then identify the first timeline divergence and make the smallest proven fix. Remove all temporary debug code before finalizing.
