# Skill Quality Checklist

Use this checklist before finalizing or shipping a skill.

## Spec checks

- [ ] Directory name exactly matches `name` in `SKILL.md`
- [ ] `name` is 1-64 characters
- [ ] `name` uses only lowercase letters, numbers, and hyphens
- [ ] `name` does not start or end with a hyphen
- [ ] `name` does not contain consecutive hyphens
- [ ] `description` is present and under 1024 characters
- [ ] Optional fields are included only when useful

## Scope and triggering

- [ ] The skill covers one coherent unit of work
- [ ] The description says both what the skill does and when to use it
- [ ] The description is written from user intent, not internal mechanics
- [ ] The description includes realistic contexts or keywords
- [ ] Nearby tasks that should not trigger are implicitly or explicitly bounded

## Instruction quality

- [ ] The `SKILL.md` body focuses on what the agent would otherwise get wrong
- [ ] Core instructions are concise and actionable
- [ ] A default approach is named when multiple options exist
- [ ] Fragile workflows use ordered steps
- [ ] Important gotchas are in `SKILL.md`, not buried elsewhere
- [ ] Output templates are included when format matters
- [ ] Validation steps are included when mistakes are costly

## Progressive disclosure

- [ ] `SKILL.md` is kept focused instead of acting as a full manual
- [ ] Large or conditional detail is moved into `references/`, `assets/`, or `scripts/`
- [ ] `SKILL.md` tells the agent when to read each extra file
- [ ] File references are shallow and relative from the skill root

## Support files

- [ ] `references/` files are targeted and easy to load on demand
- [ ] `assets/` contain templates or static resources, not instructions that must always be loaded
- [ ] `scripts/` are bundled only for repeated or fragile logic
- [ ] Scripts document dependencies and expected inputs/outputs

## Final review

- [ ] `SKILL.md` is ideally under 500 lines
- [ ] The skill reflects real source material, not generic filler
- [ ] Assumptions and missing context are called out to the user
- [ ] The final handoff tells the user how to validate and iterate
