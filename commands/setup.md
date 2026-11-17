---
description: Check Hoja credentials, both endpoints (GraphQL + hosted MCP), project selection and task enforcement
---
The hoja plugin answers `/hoja:setup` locally from its UserPromptExpansion hook, so this text normally never reaches
the model. If you are reading it, that hook did not run: tell the user to run `claude --debug=hooks,mcp` and check
that the `plugin:hoja:hoja` MCP server is connected.
