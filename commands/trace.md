---
description: "This session's trace: summary (default), upload [ISSUE] to attach it to a Hoja issue, path for the JSON file"
argument-hint: "[summary|upload [ISSUE]|path]"
---
The hoja plugin answers `/hoja:trace $ARGUMENTS` itself (UserPromptExpansion → the `plugin:hoja:hoja` MCP server), so
this text should never reach you. It did, which means that hook could not run in this session.

1. Call the `hoja_trace` MCP tool (server `hoja`). Use `{"action": "upload", "issue": "<ISSUE>"}` when the arguments
   start with `upload` (leave `issue` out when none was named), `{"action": "path"}` for `path`, and no arguments
   otherwise. Show the user its output verbatim.
2. If `hoja_trace` is not available, the plugin's MCP server is not connected: say so and point the user at
   `claude --debug=hooks,mcp` (look for `plugin:hoja:hoja`).
A summary or path only reads, so do not create a TaskManage task for it, and do not repeat this fallback text.
