---
description: "Hoja work mode for this chat: /hoja:hoja on|off|status (coarse TaskManage tasks publish to Hoja)"
argument-hint: "on|off|status"
---
The hoja plugin answers `/hoja:hoja $ARGUMENTS` locally from its UserPromptExpansion hook, so this text normally never
reaches the model. If you are reading it, that hook did not run: tell the user to run `claude --debug=hooks,mcp` and
check that the `plugin:hoja:hoja` MCP server is connected.
