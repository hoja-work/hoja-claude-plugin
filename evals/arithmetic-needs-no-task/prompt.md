---
description: A plain question needs no tools, so the plugin must not push the agent into task bookkeeping.
expected_outcome: The reply is 391 and no TaskManage or Write call was made.
tags: [smoke]
max_turns: 5
allowed_tools: [Read, Glob, Grep]
---
What is 17 multiplied by 23? Reply with just the number.
