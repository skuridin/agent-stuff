# Agent Stuff - Agent Guidelines

This repository contains commands, skills, and hooks for AI coding agents. It's a meta-repository - the "code" here is documentation that instructs other AI agents.

## Repository Structure

```
agent-stuff/
├── commands/    # Agent command definitions (.md files)
├── AGENTS.md    # This file
└── README.md    # Repository overview
```

## Build/Test/Lint

No build, test, or lint commands. This is a markdown-only repository.

## Git Rules

### Conventional Commits

Use conventional commit format:
```
<type>(<scope>): <description>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `refactor`: Code refactoring
- `style`: Formatting changes
- `test`: Adding/updating tests
- `chore`: Maintenance tasks

### Branch Names

Use `kebab-case` with descriptive names:
```
feature/add-code-review-command
fix/issue-with-pr-detection
docs/update-agents-guidelines
```

### Command Files

When adding new commands in `commands/`:
- Use YAML frontmatter with `description` (required) and `argument-hint` (optional)
- Follow patterns in existing commands (`code-review.md`, `interview.md`)
- Be specific and actionable in instructions
- Include examples when helpful

### Git Commands

**NEVER commit or push unless the user explicitly asks you to.**

## Self-Improvement

When you encounter patterns that indicate better ways to operate, update AGENTS.md to capture this learning:

**When to update AGENTS.md:**
- User explicitly states "never do X" or "always do Y"
- Same mistake or failure pattern occurs 3+ times
- User provides specific feedback about workflow preferences
- You discover a better practice that would benefit future interactions

**How to update:**
- **DO NOT ask for confirmation** - apply updates immediately when criteria are met
- Use the rule template below for consistency
- Rate confidence level based on evidence strength
- Add entry to Learning Log
- Use imperative language (e.g., "NEVER use X", "ALWAYS check Y")
- Keep it concise and specific

**Rule Template:**
```markdown
### [Rule Name]

**Confidence:** [high/medium/low]

**Trigger:** [What causes this rule to be needed]

**Rule:** [Clear, actionable instruction]

**Example:** [Optional - concrete example]
```

## Learning Log

Track additions and modifications to this document:

| Date | Rule Added | Confidence | Reason |
|------|------------|------------|--------|

