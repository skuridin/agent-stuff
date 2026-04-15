---
name: skills-creator
description: Use this skill when the user wants to create, improve, validate, or package an Agent Skill. It turns domain knowledge, successful task traces, docs, runbooks, schemas, and examples into a well-scoped skill with valid frontmatter, clear instructions, optional references/scripts/assets, and a description tuned to trigger on the right prompts.
---

# Skills Creator

Create durable Agent Skills that follow the Agent Skills specification and capture real expertise instead of generic advice.

## Use this skill when

Use this skill when the user wants to:

- create a new Agent Skill from scratch
- rewrite or improve an existing `SKILL.md`
- package supporting `references/`, `assets/`, or `scripts/`
- tighten a skill's scope or split an overgrown skill into coherent pieces
- optimize a skill description so it triggers on the right prompts
- validate that a skill matches the Agent Skills format and best practices

## Core principle: start from real expertise

Prefer source material grounded in real work:

- successful task traces
- project docs, runbooks, and style guides
- schemas, configs, and API docs
- bug reports, incident notes, and fixes
- code review comments and recurring corrections

Do **not** rely on generic knowledge alone if better source material is available.

If the user has not provided enough domain context, ask for it before finalizing the skill. If they want a first draft anyway, produce one, but clearly label assumptions, gaps, and what should be refined after real-world testing.

## Workflow

### 1. Gather the minimum inputs

Identify:

- the job the skill should help an agent perform
- the intended user intents and trigger phrases
- source material that captures real expertise
- required tools, environment constraints, or external dependencies
- non-negotiable defaults, conventions, and output formats
- common failure modes, gotchas, and naming mismatches

Ask focused questions when these are missing. Prefer a few high-value questions over a long questionnaire.

### 2. Define the skill boundary

Design the skill as a coherent unit of work.

- Too narrow: several skills must load for one normal task.
- Too broad: triggering becomes vague and instructions compete with each other.

Prefer one default approach with brief escape hatches instead of presenting a menu of equally weighted options.

### 3. Plan the package

Every skill needs a `SKILL.md`.

Add supporting files only when they improve reliability or reduce context load:

- `references/` for load-on-demand guidance the agent should read only in specific situations
- `assets/` for templates, examples, schemas, or other static resources
- `scripts/` when the agent would otherwise keep reinventing the same fragile logic

Keep file references shallow and relative from the skill root.

### 4. Draft valid frontmatter

The `SKILL.md` frontmatter must follow these rules:

- `name`: 1-64 characters, lowercase letters/numbers/hyphens only, no leading hyphen, trailing hyphen, or consecutive hyphens, and it must match the parent directory name
- `description`: 1-1024 characters, non-empty, and it should say both what the skill does and when to use it

For descriptions:

- use imperative phrasing such as `Use this skill when...`
- focus on user intent, not internal implementation
- include realistic contexts and keywords that help triggering
- mention boundaries when nearby tasks should **not** trigger the skill
- keep it concise; broad enough to trigger correctly, specific enough to avoid false positives

Only include optional fields when they add real value.

### 5. Write the body of `SKILL.md`

Only include information the agent would likely get wrong without this skill.

High-value content usually includes:

- project-specific procedures
- required step ordering for fragile tasks
- defaults and preferred tools
- gotchas and counterintuitive facts
- checklists for multi-step workflows
- validation loops before final output
- output templates when format matters

Avoid long background explanations of things the agent already knows.

Keep core instructions concise. Move detailed material into separate files and explicitly tell the agent when to read them.

### 6. Use progressive disclosure on purpose

When you need extra detail, prefer small targeted files over a giant `SKILL.md`.

- Read `assets/SKILL-template.md` if you need a starter skeleton for a new skill.
- Read `references/quality-checklist.md` before finalizing any skill.
- Read `references/description-optimization.md` when the user wants to improve trigger quality or build evals.
- Read `assets/trigger-eval-queries.template.json` when you need a starting format for description eval queries.

### 7. Validate before finishing

Before you present the skill, verify all of the following:

- the directory name matches the `name`
- frontmatter fields satisfy spec limits
- the description is under 1024 characters
- referenced files exist and use shallow relative paths
- `SKILL.md` stays focused; ideally under 500 lines and about 5000 tokens
- any bundled scripts are actually the safest way to handle repeated logic

If the environment supports it, run:

```bash
skills-ref validate ./skill-name
```

### 8. Optimize the description when needed

If triggering quality matters, treat the description as something to test, not guess.

- create realistic should-trigger and should-not-trigger queries
- prefer near-miss negatives over obviously unrelated negatives
- run multiple trials because triggering is nondeterministic
- use a train/validation split to avoid overfitting
- revise based on categories of failures, not single keywords

Use the reference file for the full workflow.

### 9. Deliver the result clearly

When you finish:

- create the files in the correct directory structure
- summarize what you created and where
- call out assumptions, missing source material, or follow-up questions
- suggest how the user should validate or iterate on the skill

## Patterns worth using

Use these when they fit the task:

- **Gotchas sections** for non-obvious corrections
- **Checklists** for multi-step work
- **Validation loops** to force self-checks before completion
- **Plan-validate-execute** for destructive or batch workflows
- **Templates** when output format needs to be consistent

## Common mistakes to avoid

- writing a skill from generic knowledge when stronger source material exists
- stuffing `SKILL.md` with background the agent already knows
- giving too many equal options instead of naming a default
- creating vague descriptions like `Helps with PDFs`
- overfitting descriptions to one exact eval prompt
- hiding crucial gotchas in deep reference chains
- splitting the task across too many tiny skills

## Final response format

Use a concise handoff like this:

```markdown
Created:
- `path/to/skill/SKILL.md`
- `path/to/skill/references/...`
- `path/to/skill/assets/...`

Notes:
- Key assumptions or constraints
- Any missing source material worth adding later

Suggested next steps:
1. Validate the skill
2. Run a few realistic prompts
3. Refine gotchas and description based on real runs
```
