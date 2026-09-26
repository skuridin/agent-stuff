---
name: publish-html-report
description: Use this skill whenever you create or finish a standalone HTML report or presentation intended for the requester to view in a browser. Publish the finished file and refresh the shared reports index; do not use for application pages, templates, or build output.
---

# Publish HTML reports

After creating or finishing a standalone HTML report or presentation for the requester, publish it before responding. Do not create or edit the report as part of publishing.

1. Confirm the report is complete and is an intended user-facing artifact, not an application page, template, draft, or build output. Do not publish secrets or sensitive personal information unless explicitly requested.
2. Run `scripts/publish-html-report.py /absolute/path/to/report.html`, passing the finished file. The script copies it to `/srv/html-reports` and regenerates that directory's `index.html`.
3. Return the report URL and the index URL printed by the script. Do not claim success if the script fails; report the error instead.

Publishing preserves the source file. If a destination name already exists, the script chooses a timestamped name rather than overwriting the existing report. `HTML_REPORT_DIR` and `HTML_REPORT_BASE_URL` may be set when the host uses a different directory or URL; defaults match the configured VM.
