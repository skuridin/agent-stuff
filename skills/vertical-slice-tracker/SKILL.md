---
name: vertical-slice-tracker
description: Break implementation work into end-to-end vertical slices, create or update a markdown task tracker when the user asks for written planning, and keep each task's completion status current as work progresses. Use when a user asks to split a feature, bugfix, migration, refactor, or project into slices/tasks, wants the plan written to a markdown file, or wants task statuses maintained while the work is being executed.
---

# Vertical Slice Tracker

## Overview

Break work into thin, end-to-end slices that deliver visible progress without splitting planning into frontend/backend/database silos. When the user asks for a written plan, create or update a markdown tracker and treat it as a live artifact that must stay in sync with the real state of the work.

## Workflow

### 1. Define the outcome

- Restate the behavior or capability to deliver.
- Split by user-visible or system-visible value, not by technical layer.
- Keep platform or infrastructure setup as its own task only when it blocks multiple slices.

### 2. Build vertical slices

- Make each task represent a complete increment of value.
- Include all work needed for that slice: UI, API calls, state, persistence, validation, tests, docs, analytics, or rollout notes as needed.
- Keep tasks small enough to finish in one focused session when possible.
- Add dependencies explicitly in notes instead of relying on implied ordering.

### 3. Write the tracker only when the user asks

- Create or update a markdown file only when the user asks to write the plan down, track it in a file, or maintain progress in markdown.
- Prefer the user-provided path.
- If no path is given, choose a sensible repo-local path such as `docs/plans/<slug>.md` or `tasks/<slug>.md`.
- Use `assets/task-tracker-template.md` as the default structure.

### 4. Keep status current

- Every tracked task must include a `Status` field.
- Allowed values: `TODO`, `IN PROGRESS`, `DONE`.
- Update the markdown file immediately when a task starts, finishes, splits, or is replaced.
- Do not leave completed work marked `TODO` in the final state.
- Do not silently delete completed tasks. If scope changes, rename the task or add a replacement task and note the change.

### 5. Execute and sync

- Before working on a tracked task, set its status to `IN PROGRESS`.
- After implementation and verification, set its status to `DONE`.
- If work is blocked, keep the task `IN PROGRESS` or move it back to `TODO` and record the blocker in `Notes`.
- Before the final response, confirm the tracker matches reality.

## Tracker Writing Rules

- Use a flat markdown table with stable task IDs.
- Keep slice names short and outcome-oriented.
- Put validation notes, blockers, links, or dependency hints in the `Notes` column.
- Order tasks by dependency first, then by value delivery.
- Prefer 3-8 meaningful slices over a long checklist of technical subtasks.

## Avoid

- Do not create top-level tasks like "frontend", "backend", and "database" unless the user explicitly wants horizontal planning.
- Do not split one user-visible slice into multiple tracker rows just to mirror the codebase layout.
- Do not mark a task `DONE` before the relevant work and checks are actually complete.

## Template

Start from `assets/task-tracker-template.md` when creating a new tracker file.

## Example Triggers

- "Break this feature into vertical slices."
- "Write a markdown task tracker for this migration."
- "Plan this refactor as vertical slices and keep the file updated while you work."
