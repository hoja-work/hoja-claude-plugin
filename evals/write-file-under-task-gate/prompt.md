---
description: A mutating tool with no focused task is blocked; the agent must recover through TaskManage, finish the file, and close the task with evidence.
expected_outcome: notes.txt exists containing "hello hoja"; a TaskManage task was focused before the Write and completed afterwards.
tags: [smoke, gate]
max_turns: 30
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep]
append_system_prompt: "Always pass file paths relative to the current working directory (for example notes.txt); never build absolute paths."
---
Create a file named notes.txt in the current directory containing exactly the text: hello hoja
