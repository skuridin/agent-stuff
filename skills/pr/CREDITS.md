# Credits

The **Summary** section's menu of visuals (pseudocode, call trees, component trees, file trees, Mermaid, diffs) and its placement guidance come from [Dex Horthy](https://github.com/dexhorthy)'s [`show-me`](https://github.com/humanlayer/humanlayer) skill, reproduced almost word for word and aimed at a diff instead of a live conversation. `pr` does not depend on `show-me` as a skill (it isn't part of this repo, and a hard dependency would break standalone installs), so the content is copied in rather than pointed at; this file is the attribution a dependency would otherwise have carried.

## Source

Copy of the [`pr`](https://github.com/mattpocock/skills/tree/abeeaf95660ba9e8b7c753eb38f441ca707a8823/skills/engineering/pr) skill from [`mattpocock/skills`](https://github.com/mattpocock/skills), MIT licensed (see `LICENSE`). Local changes:

- `Evidence` gained "Attaching screenshots and videos", which documents the `gh` `--attach` flag.
- The first paragraph under `Sections` keeps "if it has one (for example `GLOSSARY.md` or `docs/terms.md`)". Upstream reads "Use the user's domain language from `GLOSSARY.md`".
