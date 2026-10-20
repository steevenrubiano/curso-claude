#!/usr/bin/env bash
# Blocks tool calls that try to access issues.json (Read, Grep, Glob, Bash).
input=$(cat)

targets=$(echo "$input" | jq -r '[.tool_input.file_path, .tool_input.path, .tool_input.pattern, .tool_input.glob, .tool_input.command] | map(select(. != null)) | join(" ")')

if echo "$targets" | grep -qi 'issues\.json'; then
  echo "Blocked: access to issues.json is not allowed." >&2
  exit 2
fi

exit 0
