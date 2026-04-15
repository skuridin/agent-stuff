# Description Optimization Workflow

Use this workflow when a skill's description needs to trigger more reliably.

## Goal

Improve triggering without making the description vague or over-broad.

## 1. Build an eval set

Create about 20 realistic user prompts:

- 8-10 that **should** trigger the skill
- 8-10 that **should not** trigger the skill

Favor realism:

- vary phrasing, detail, and tone
- include typos, abbreviations, and casual wording
- include indirect requests where the user intent implies the skill even without naming it
- include near-miss negatives that share surface keywords but require a different skill

## 2. Split the eval set

Keep two fixed groups:

- **Train set**: use this to diagnose failures and revise the description
- **Validation set**: use this only to judge whether improvements generalize

Do not tune against the validation set.

## 3. Run multiple trials

Triggering is nondeterministic. Run each query multiple times, such as 3 runs per query, and compute a trigger rate.

Reasonable default rule:

- should-trigger passes if trigger rate is greater than 0.5
- should-not-trigger passes if trigger rate is less than 0.5

## 4. Diagnose failures by category

When should-trigger queries fail, the description may be too narrow. Expand by adding general contexts or intents.

When should-not-trigger queries fail, the description may be too broad. Tighten the boundary and clarify what the skill does not cover.

Do **not** just paste keywords from a single failed query into the description. Generalize from the pattern instead.

## 5. Revise carefully

A strong description usually:

- starts with `Use this skill when...`
- describes user intent rather than implementation details
- includes concrete contexts where the skill is useful
- stays concise enough to avoid bloating global skill metadata
- remains under the 1024-character hard limit

## 6. Pick the best version

The best description is the one with the strongest validation performance, not necessarily the last one you wrote.

## Suggested manual output

When reporting the result, include:

- current description
- updated description
- notable false positives and false negatives from the train set
- validation pass rate for each serious candidate
