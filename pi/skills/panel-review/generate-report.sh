#!/usr/bin/env bash
# Usage: generate-report.sh <json-file> <output-name>
# Injects review JSON into the HTML template and writes to /tmp/panel-review-<output-name>.html

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TEMPLATE="$SCRIPT_DIR/template.html"
JSON_FILE="${1:?Usage: generate-report.sh <json-file> <output-name>}"
OUTPUT_NAME="${2:?Usage: generate-report.sh <json-file> <output-name>}"
OUTPUT="/tmp/panel-review-${OUTPUT_NAME}.html"

if [[ ! -f "$TEMPLATE" ]]; then
  echo "Error: template not found at $TEMPLATE" >&2
  exit 1
fi

if [[ ! -f "$JSON_FILE" ]]; then
  echo "Error: JSON file not found at $JSON_FILE" >&2
  exit 1
fi

# Replace placeholder in template with JSON content (using Python to avoid sed escaping issues)
python3 -c "
import sys
template = open(sys.argv[1]).read()
json_data = open(sys.argv[2]).read()
open(sys.argv[3], 'w').write(template.replace('{\"issues\":[]}', json_data))
" "$TEMPLATE" "$JSON_FILE" "$OUTPUT"

echo "$OUTPUT"
