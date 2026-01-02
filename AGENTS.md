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
