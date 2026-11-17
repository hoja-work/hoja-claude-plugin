---
description: Show the read-only TaskManage board (focused task, its acceptance questions, next task, all tasks)
---
The hoja plugin answers `/hoja:tasks` locally from its UserPromptExpansion hook, so this text normally never reaches
the model. If you are reading it, that hook did not run: tell the user to run `claude --debug=hooks,mcp` and check
that the `plugin:hoja:hoja` MCP server is connected.
