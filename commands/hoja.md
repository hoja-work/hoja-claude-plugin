---
description: "Hoja work mode for this chat: /hoja:hoja on|off|status (coarse TaskManage tasks publish to Hoja)"
argument-hint: "on|off|status"
---
The hoja plugin answers `/hoja:hoja $ARGUMENTS` itself (UserPromptExpansion → the `plugin:hoja:hoja` MCP server), so
this text should never reach you. It did, which means that hook could not run in this session.

1. Call the `hoja_setup` MCP tool (server `hoja`) with no arguments and show its `Hoja mode:` line, so the user learns
   whether publication is on and which project it targets.
2. If `hoja_setup` is not available, the plugin's MCP server is not connected: say so and point the user at
   `claude --debug=hooks,mcp` (look for `plugin:hoja:hoja`).
Mode changes (`on`/`off`) only take effect through the hook, so do not pretend to apply them; report what the tool says.
Do not create a TaskManage task for this, and do not repeat this fallback text.
