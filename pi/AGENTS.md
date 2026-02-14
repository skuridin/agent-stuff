# Global Agent Guidelines

## Token-efficient file discovery

- NEVER run `ls -R` from repository root unless the user explicitly asks for a full recursive tree.
- ALWAYS scope listing commands to the smallest relevant path (e.g. `ls web/frontend/features/shared/components/ui/Combobox`).
- ALWAYS prefer targeted discovery commands over full tree dumps (e.g. `rg --files <path>`, `find <path> -maxdepth <n>`).
- ALWAYS cap exploratory output when possible (e.g. pipe to `head -n 50`).
- When the user provides an exact file path, skip directory exploration and read the file directly.

