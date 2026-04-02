---
name: functional-spec
description: Write durable Functional Specifications that describe desired behavior, constraints, and acceptance criteria without coupling the document to implementation details. Use when drafting functional specs, product requirements, or outcome-focused design documents.
---

# Functional Specification Skill

Use this skill when the user wants a Functional Specification, product requirements document, or other outcome-focused spec that should remain valid even if the implementation changes.

## Core principle

Write the destination, not the journey.

- Describe what must be true for users, operators, or external systems.
- Describe observable behavior, policies, constraints, and acceptance criteria.
- Avoid locking the document to architecture, code structure, vendors, or execution plans unless those details are part of the external contract.

The spec should still read as correct if the team later changes the tech stack, data model, service boundaries, UI framework, or rollout approach.

## What a good Functional Specification contains

- Problem statement
- Goals and intended outcomes
- Scope and non-goals
- Actors or user types
- Functional requirements
- Business rules and invariants
- User-visible states and transitions
- Inputs, outputs, and externally visible interfaces
- Edge cases and failure behavior from the user's perspective
- Acceptance criteria
- Assumptions, dependencies, and open questions

## What to avoid

Do not include these unless they are externally binding requirements:

- Internal architecture
- Database tables or schemas
- Queues, cron jobs, workers, or event buses
- Class names, hooks, services, modules, or file structure
- Endpoints or RPC method names that are not part of a published contract
- Step-by-step implementation plans
- Team task breakdowns, milestones, or rollout phases
- Test implementation details
- Monitoring or instrumentation mechanics
- One specific technical approach presented as if it were the requirement

If a detail could change without changing the promised behavior, it probably does not belong in the Functional Specification.

## Durable writing test

Before keeping any sentence, ask:

1. Would this still be true if the implementation were rewritten from scratch?
2. Is this observable by a user, operator, admin, partner, or external system?
3. Is this a requirement, or just one possible solution?

If the sentence fails that test, rewrite or remove it.

## Rewrite implementation details into functional statements

Translate brittle wording into durable wording.

- Instead of: "Use Redis to enforce rate limits."
- Write: "Requests beyond the allowed threshold are blocked consistently across all application instances."

- Instead of: "Create a retry queue for failed sync jobs."
- Write: "Transient synchronization failures are retried automatically before the user is asked to act again."

- Instead of: "Store audit rows in Postgres."
- Write: "Authorized administrators can review a complete history of relevant changes."

- Instead of: "Add a webhook to notify downstream systems."
- Write: "Connected external systems are notified when the status changes within the required time window."

- Instead of: "Call `/v2/refunds` and set `refund_state=pending`."
- Write: "Authorized support staff can initiate a refund, and the refund is shown to the customer as pending until it is finalized."

## Clarify only what matters

Ask short questions only when the destination is underspecified. Prioritize questions like:

- Who is the actor?
- What must they be able to do, see, or prevent?
- What must always be true?
- What is explicitly out of scope?
- How will we know the requirement is satisfied?
- Are there external contracts, regulatory rules, or hard deadlines that are part of the requirement?

If exact values are unknown, do not invent them. Mark them as open questions.

## Writing rules

- Prefer "must" for required behavior and "must not" for prohibited behavior.
- Make each requirement independently testable.
- Use stable domain language, not temporary project code names.
- Separate policy from implementation.
- State thresholds, limits, and timing expectations explicitly when they matter.
- Describe failures in terms of what the actor experiences and what the system guarantees.
- Keep requirements atomic. Split compound requirements into smaller numbered items.
- Use examples only to illustrate behavior, not to narrow the requirement accidentally.

## Recommended structure

Use this structure unless the user asks for a different format.

```markdown
# <Feature or capability name>

## Summary

<One short paragraph describing the outcome this feature must deliver.>

## Problem

<What problem exists today and who it affects.>

## Goals

- <Desired outcome>
- <Desired outcome>

## Non-Goals

- <Explicitly out of scope>
- <Explicitly out of scope>

## Actors

- <Primary actor>
- <Secondary actor>

## Functional Requirements

1. The system must ...
2. The system must ...
3. The system must not ...

## Business Rules and Invariants

- <Rule that must always hold>
- <Rule that must always hold>

## User-Visible States and Transitions

- <State>: <What it means from the actor's perspective>
- <Transition>: <What causes the change and what becomes true after it>

## Edge Cases and Failure Handling

- <Condition>: <Required behavior>
- <Condition>: <Required behavior>

## Acceptance Criteria

1. <Testable statement of success>
2. <Testable statement of success>
3. <Testable statement of success>

## Assumptions and Dependencies

- <External dependency or assumption that affects the requirement>

## Open Questions

- <Question that must be resolved>
```

## Requirement quality bar

A strong requirement is:

- Necessary
- Unambiguous
- Observable
- Testable
- Stable under implementation change
- Specific enough that two teams would build materially similar behavior

## Review checklist

Before finalizing the spec, check:

1. Does it describe outcomes instead of implementation?
2. Does it define scope and non-goals clearly?
3. Are business rules and invariants explicit?
4. Are edge cases and failures covered at the behavior level?
5. Are acceptance criteria concrete and testable?
6. Could the document survive a change in framework, storage, or service design?
7. Did any accidental solutioning slip in?

## Tone

- Be direct and precise.
- Prefer plain language over technical jargon.
- Avoid speculative architecture discussion.
- Do not pad the document with process language.

## Example framing

Bad framing:

"Implement a worker that listens for invoice events and writes reminder records so a cron can send emails."

Good framing:

"Customers with overdue invoices receive reminder notifications according to the reminder policy, and authorized staff can see whether a reminder has already been sent."

Bad framing:

"Build a React modal that posts to a new endpoint for address verification."

Good framing:

"Before an address is saved, the user is told whether the address appears valid and is given a clear way to confirm or correct it."

## Output expectations

When using this skill:

1. Write the Functional Specification itself, not a plan for writing it.
2. If critical information is missing, ask the smallest set of questions needed.
3. When context contains technical implementation ideas, extract the underlying requirement and write that instead.
4. Keep the final document robust against foreseeable technical refactors.
