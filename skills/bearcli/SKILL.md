---
name: bearcli
description: Use Bear CLI to read, search, create, and safely edit Bear notes from the terminal. Use when users ask to automate note workflows, manage tags/pins/attachments, or script Bear operations.
compatibility: Requires Bear app and `bearcli` installed on macOS.
---

# Bear CLI Skill

Use this skill when the user wants to work with Bear notes via `bearcli`.

## Defaults

- Prefer `--format json` for machine-readable output.
- Prefer note IDs over titles once an ID is known.
- Treat mutating commands as **silent on success** (check exit code).
- For large result sets, limit scope with `-n`, `--offset`, and `--fields`.

## Read/Search workflow

1. Discover notes:
   - `bearcli list --format json`
   - `bearcli search "<query>" --format json`
2. Inspect metadata:
   - `bearcli show <id> --format json --fields all`
3. Read raw content:
   - `bearcli cat <id> --format json`
   - Use `--offset/--limit` for slicing large notes.
4. Search exact text inside one note:
   - `bearcli search-in <id> --string "..." --format json`

## Safe write workflow

Prefer smallest safe mutation first:

1. **Targeted edits**: `bearcli edit`
2. **Append/prepend**: `bearcli append`
3. **Full replacement**: `bearcli overwrite` (with hash guard)

For overwrite, avoid clobbering concurrent edits:

```bash
HASH=$(bearcli show <id> --format json --fields hash | jq -r '.hash')
bearcli overwrite <id> --base "$HASH" --content "# Title\nUpdated body"
```

If overwrite/edit reports attachment-removal rejection, only re-run with `--force` after confirming intent.

## Common command patterns

### Create

```bash
bearcli create "My Note" --content "Body" --tags "work,draft" --format json
```

Notes:
- `create` returns structured output (capture `id`).
- `--if-not-exists` requires title and returns existing note when present.

### Edit exact text

```bash
bearcli edit <id> --find "TODO" --replace "DONE"
bearcli edit <id> --find "## Notes" --insert-after "\nNew line"
```

### Append/prepend

```bash
bearcli append <id> --content "New paragraph"
bearcli append <id> --content "Intro" --position beginning
```

### Tags

```bash
bearcli tags list --format json
bearcli tags add <id> work "work/project"
bearcli tags remove <id> draft
bearcli tags rename old-tag new-tag
```

### Pins

```bash
bearcli pin list --format json
bearcli pin add <id> global
bearcli pin add <id> work
bearcli pin remove <id> global
```

### Archive/Trash/Restore

```bash
bearcli archive <id>
bearcli trash <id>
bearcli restore <id>
```

### Attachments

```bash
bearcli attachments list <id> --format json
bearcli attachments add <id> --filename photo.jpg < photo.jpg
bearcli attachments save <id> --filename photo.jpg > photo.jpg
bearcli attachments delete <id> --filename photo.jpg
```

## Query and format gotchas

- `search` supports Bear inline operators (`@today`, `#tag`, `@todo`, etc.).
- If query starts with `-`, use `--query` form.
- `--count` returns `{"count":N}` in JSON mode.
- Empty JSON results are usually `[]` with exit code 0.
- `show --fields all` excludes content; use `--fields all,content`.

## Mutation gotchas

- Mutating commands do not accept `--format` and print nothing on success.
- `tags add/remove/rename/delete` do not update note modified date.
- `overwrite` replaces entire note; preserve title/tags/attachment refs intentionally.
- `append --position` respects Bear's top/bottom tag placement rules.

## Validation loop before finishing

- Confirm target note (`show` id/title/tags).
- If overwriting, fetch `hash` and pass `--base`.
- Re-read note (`show`/`cat`) after mutation.
- For scripted flows, run with `--format json` for all read commands.
