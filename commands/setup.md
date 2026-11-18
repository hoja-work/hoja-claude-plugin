---
description: Check Hoja credentials, both endpoints (GraphQL + hosted MCP), project selection and task enforcement
---
The hoja plugin answers `/hoja:setup` itself (UserPromptExpansion → the `plugin:hoja:hoja` MCP server), so this text
should never reach you. It did, which means that hook could not run in this session. Do this instead — it is a
read-only health check, so **do not create a TaskManage task for it**:

1. Call the `hoja_setup` MCP tool (server `hoja`) with no arguments and show the user its output verbatim.
2. If `hoja_setup` is not available either, the plugin's MCP server is not connected in this session. Then tell the
   user, in at most three lines:
   - `/hoja:setup` could not answer because the `plugin:hoja:hoja` MCP server is not connected;
   - run `claude --debug=hooks,mcp` and look for `MCP server "plugin:hoja:hoja"` and `Hook UserPromptExpansion`;
   - reconnect or reinstall the plugin (`/plugin` → hoja → enable, or `/plugin install hoja@hoja`).
Do not guess the configuration and do not repeat this fallback text.
