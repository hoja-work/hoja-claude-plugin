---
description: Show the read-only TaskManage board (focused task, its acceptance questions, next task, all tasks)
---
The hoja plugin answers `/hoja:tasks` itself (UserPromptExpansion → the `plugin:hoja:hoja` MCP server), so this text
should never reach you. It did, which means that hook could not run in this session. Do this instead — it only reads:

1. Call `TaskManage` with `{"operations": [{"key": "board", "op": "list"}]}` and show the user the board: task id,
   subject, status, which task is active, and each task's acceptance questions.
2. If `TaskManage` is not available, the plugin's MCP server is not connected: tell the user to run
   `claude --debug=hooks,mcp` and check that `plugin:hoja:hoja` is connected, then reconnect or reinstall the plugin.
Do not create or modify tasks for this, and do not repeat this fallback text.
