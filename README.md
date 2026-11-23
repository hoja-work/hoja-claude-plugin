<div align="center">

<img src="assets/hoja.svg" width="72" height="72" alt="Hoja">

# Hoja for Claude Code

**Tasks that can't be marked done without proof — and a trace of how the work was done.**
Trebol's TaskManage, its task-enforcement gate, Hoja issue sync and session traces — as a Claude Code plugin.

[![License: MIT](https://img.shields.io/badge/license-MIT-2F855A.svg)](LICENSE)
[![Claude Code plugin](https://img.shields.io/badge/Claude%20Code-plugin-D97757.svg)](https://code.claude.com/docs/en/plugins)
[![Tests](https://img.shields.io/badge/tests-376%20passing-2F855A.svg)](#verify-it-yourself)
[![Codex version](https://img.shields.io/badge/also%20for-Codex-111111.svg)](https://github.com/hoja-work/hoja-codex-plugin)

</div>

---

Agents say "done" too easily. Hoja makes "done" mean something:

- **Every task has acceptance questions.** "Do the tests pass?" "Is the README updated?" — written up front.
- **Completion needs evidence that resolves.** Each answer cites `src/app.ts#L10-L40`, `README.md#Install`, or
  `tool:Bash#3` — a real file or a real tool result from *this* session. Made-up evidence is rejected.
- **Nothing mutates without a task.** A gate blocks writes, edits and shell commands until a task is focused.
  Reads are always free.
- **Your tracker stays current by itself.** With Hoja mode on, each top-level task becomes a Hoja issue, its
  progress is rewritten in place, and an evidenced completion moves it to Done.
- **Every session leaves a trace.** Turns, model calls with token usage, every tool call with its duration and
  outcome, gate blocks and subagents are recorded. When a task completes, the trace is attached to its issue, and
  Hoja opens it in a trace viewer.

This is not a re-implementation. The engine, the gate and Hoja mode are
[Trebol](https://github.com/cloverinternational/trebol)'s own code, vendored byte-for-byte and hash-checked. The
plugin only translates between Claude Code's hooks and Trebol's runtime.

## Quick start

```text
/plugin marketplace add hoja-work/hoja-claude-plugin
/plugin install hoja@hoja
```

Claude Code asks for your Hoja endpoint and token (both optional — see [Configuration](#configuration)). Then just
work as usual. An abridged, illustrative session:

```text
> add a --json flag to the CLI

● Bash(touch src/cli/json.ts)
  ⎿  [TASK ENFORCEMENT - BLOCKED] YOU CANNOT EXECUTE ANY TOOL WITHOUT A TASK …

● hoja - TaskManage (create "Add --json flag", questions: flag-works, tests-pass; in_progress, active)
  ⎿  succeeded · published HOJA-712

● Bash(touch src/cli/json.ts) … Edit … Bash(npm test)

● hoja - TaskManage (completed · flag-works ← tool:Bash#4 · tests-pass ← tool:Bash#5)
  ⎿  succeeded · HOJA-712 → Done
     Hoja trace: attached this session's trace to HOJA-712 (Claude Code trace · 3m 12s · 1 turn · 9 tool calls · 1 blocked · 412k tokens).
```

Run `/hoja:setup` at any time to check your configuration.

## What you get

| | |
| --- | --- |
| **`TaskManage`** | Ordered, durable tasks with dependencies, sub-tasks, notes and 1–12 acceptance questions each. Completion is validated against the workspace and the session transcript. |
| **Task gate** | Trebol's Swarm hook pipeline: blocks non-read-only tools without a focused task (`block`), or only nudges (`advise`). Also: the completion nudge, the task-maintenance nudge, the bare-`sleep` blocker and the stdin-conflict guard. |
| **Auto-continue** | When a gate block ends the turn, Claude is sent back with exactly what to do, within the same bounded budget Trebol uses. |
| **Hoja mode** | `hoja_list`, `hoja_get` and `hoja_project`, plus automatic publication: one Hoja issue per coarse task, acceptance questions in the description, an evidence comment and Done on completion. |
| **Hosted Hoja API** | The workspace's full MCP API (70+ tools: issues, comments, decisions, projects, cycles) as a second server, `hoja-api`. Its **read** tools are exempt from the gate (see [Deviations from Trebol](#deviations-from-trebol)); its writes are gated and evidence-checked under the same names Trebol uses. |
| **Session traces** | Every hook event is recorded; with the transcript and subagent transcripts it becomes a `hoja.trace/v1` JSON trace. Completing a task linked to an issue attaches the trace to that issue (see [Session traces](#session-traces)). |
| **Commands** | `/hoja:tasks` (task board), `/hoja:hoja on\|off\|status` (Hoja mode for this chat), `/hoja:trace [upload [ISSUE]\|path]` (this session's trace), `/hoja:setup` (diagnostics). All are answered locally, with no model turn — and `hoja_setup` / `hoja_trace` are the tool fallbacks if a hook cannot run. |

## Configuration

The simplest setup is to sign in once with the Hoja CLI:

```bash
hoja auth login acme.hoja.work
```

With no token configured, the plugin asks the CLI for a current token and the workspace's endpoints
(`hoja auth token --json`), and asks again when the token expires or is rejected. Nothing to paste.

For automation, or without the CLI, set values when Claude Code prompts on install (plugin `userConfig`), later with
`/plugin configure hoja@hoja`, or through environment variables; a configured token always wins over the CLI
sign-in. Every value is optional: without credentials, TaskManage and the gate still work and publication is simply
skipped. An endpoint typed without a scheme gains `https://`; plain `http://` is accepted only for a loopback
hoja-serve.

| Setting (`userConfig`) | Environment fallback | Purpose |
| --- | --- | --- |
| `hoja_api_url` | `HOJA_API_URL` (deprecated alias: `LINEAR_API_URL`) | Hoja GraphQL endpoint, e.g. `https://hoja.example.com/graphql` |
| `hoja_mcp_url` | `HOJA_MCP_URL` | Hosted MCP endpoint. Derived from the GraphQL host when unset |
| `hoja_token` *(marked sensitive)* | `HOJA_TOKEN` (deprecated alias: `LINEAR_TOKEN`) | Personal API token |
| `hoja_project` | `HOJA_PROJECT` | Default project for publication. Also `.pi/config/hoja.json` in the repo |
| `task_enforcement` | `HOJA_TASK_ENFORCEMENT` | `block` (default) · `advise` · `off` |
| `trace_upload` | `HOJA_TRACE_UPLOAD` | `completion` (default): attach the trace when a linked task completes · `session-end`: also attach the final trace to every linked issue when the session ends · `manual`: only `/hoja:trace upload` · `off` |
| `trace_detail` | `HOJA_TRACE_DETAIL` | `full` (default): whole prompts, tool inputs and outputs and model responses, secret-scrubbed · `metadata`: names, timings, statuses and token counts only |

Like Trebol, there is **no default endpoint**: without a CLI sign-in or a configured endpoint, Hoja calls fail closed
with a message saying how to sign in.

## Session traces

Every hook event is appended to `${CLAUDE_PLUGIN_DATA}/traces/<session>.events.jsonl` as it happens. When a trace is
needed, the plugin builds it from those records plus the session transcript and its subagent transcripts:

- **Hooks** are the documented, stable source. They give exact tool durations (`duration_ms`), the gate's decisions,
  subagent start and stop, compactions, notifications and failures.
- **The transcript** adds model requests (model, token usage, stop reason, thinking time) and the turn structure.
  Its format is internal to Claude Code, so it is read defensively. If it cannot be read, the trace is built from
  hooks alone and says so.

A trace is uploaded with the same two calls the Hoja web app uses: `POST /api/uploads`, then `attachmentCreate`.
That happens when a task linked to an issue completes, once per task and session, and the result is reported in the
TaskManage result. A failed upload is reported there too and never fails the task. In Hoja, a
`*.trace.json` attachment opens in the trace viewer: summary tiles, a collapsible waterfall, a per-tool breakdown and
the task trail.

| Command / tool | What it does |
| --- | --- |
| `/hoja:trace` · `hoja_trace` | Summary of this session: time, turns, model calls, tool table, slowest and failed calls, files written, tokens. It also saves the JSON. This only reads, so the gate does not block it |
| `/hoja:trace upload [ISSUE]` · `hoja_trace {action: "upload", issue}` | Attach the trace now, to the named issue or to every issue this session's tasks are linked to. This is a write, so the gate applies |
| `/hoja:trace path` | Where the JSON is saved locally |

**What leaves your machine.** Traces go only to your own Hoja workspace, and only when a task is linked to an issue
or you upload one explicitly. By default a trace carries **full content**: whole prompts, tool inputs, tool outputs
and model responses. It is your data, and an error is usually at the end of an output, so nothing is cut to a preview.
Only a single field longer than 256,000 characters is trimmed, and when a whole trace would pass the 8 MB upload
budget (Hoja's limit is 10 MB), the largest fields shrink step by step. Trimming always keeps the head and the tail
and states how much was left out; spans are dropped only as a last resort. A 1-hour session with 7 subagents and 709
tool calls was 3.9 MB.

Every field is scrubbed of known credential shapes (Anthropic, OpenAI, GitHub, Slack, AWS and Google keys, JWTs,
private keys, `token=` / `Authorization:` values) and of the values of secret-looking environment variables. The
first upload in a session and `/hoja:setup` both say that full content is included. Use `trace_detail: metadata` to
send only names, timings, statuses and token counts, which matches Claude Code's own telemetry defaults. Use
`trace_upload: manual` or `off` to keep traces local.

**Format.** `hoja.trace/v1` is a flat list of spans (`session` → `turn` → `llm` / `tool` → `subagent` → …) linked
by `parentId`, plus instant `events`. Names follow Claude Code's OpenTelemetry output where the meaning is the same:
`turn` ≈ `claude_code.interaction`, `llm` ≈ `claude_code.llm_request`, `tool` ≈ `claude_code.tool`. The attributes
`model`, `request_id`, `tool_name`, `tool_use_id`, `success`, `input_tokens`, `output_tokens`, `cache_read_tokens`
and `cache_creation_tokens` use the same names too. The trace carries no cost figure. The only cost Claude Code
publishes is a client-side estimate that hooks cannot read, and a price table in the plugin would go out of date.
The schema is in [`src/trace/schema.ts`](src/trace/schema.ts).

## How it works

One MCP server process per session holds the task state, the gate and the Hoja client. It serves the tools *and*
receives every hook event, so all of them share memory — exactly as they do inside Trebol's Pi runtime.

```mermaid
flowchart LR
  subgraph client["Claude Code"]
    U(["You"])
    M["Model"]
    H["Hook events"]
  end
  subgraph plugin["hoja plugin (Node, stdio)"]
    SS["session-start.mjs<br/>(command hook)"]
    S[["server.mjs<br/>TaskManage · hoja_* · __hoja_hook"]]
    V["vendor/trebol<br/>engine · gate · hoja-mode"]
    P["api-proxy.mjs<br/>(hoja-api)"]
    J[("plugin data<br/>sessions/*.jsonl")]
    T[("Claude transcript")]
  end
  subgraph ext["Hoja workspace"]
    G["GraphQL API"]
    X["Hosted MCP API"]
  end
  U --> M
  M -->|tool calls| S
  M -->|tool calls| P
  H -->|mcp_tool hooks| S
  SS -->|system prompt context| M
  S --> V
  S --> J
  S -->|reads evidence| T
  V -.->|HTTPS publish| G
  P -->|HTTPS + Bearer| X
```

A gated turn, end to end:

```mermaid
sequenceDiagram
  box Claude Code
    participant M as Model
    participant CC as Hook runner
  end
  box hoja plugin
    participant S as server.mjs
    participant V as Trebol pipeline
  end
  M->>CC: Bash(touch notes.md)
  CC->>S: PreToolUse → __hoja_hook
  S->>V: preTool(Bash)
  V-->>S: block (no focused task)
  S-->>CC: permissionDecision: deny + Trebol's block text
  CC-->>M: blocked
  M->>S: TaskManage create + focus
  S-->>M: succeeded (Hoja issue published)
  M->>CC: Bash(touch notes.md)
  CC->>S: PreToolUse
  S-->>CC: allow
  M->>S: TaskManage complete, evidence tool:Bash
  S->>S: resolve evidence in the transcript
  S-->>M: succeeded (issue → Done)
```

### Trebol → Claude Code mapping

| Trebol (Pi runtime) | Claude Code |
| --- | --- |
| `registerTool` (TaskManage, hoja_*) | MCP stdio server `dist/server.mjs`, with tools loaded upfront |
| `tool_call` block / pre-context | `PreToolUse` deny / `additionalContext` |
| `tool_result`, `turn_end` | `PostToolUse` (+`Failure`), `PostToolBatch` |
| `before_agent_start` system prompt | `SessionStart` command hook (also records the session start for tracing) |
| `agent_before_settle` gate resume | `Stop` → `additionalContext` |
| `/tasks`, `/hoja` | `/hoja:tasks`, `/hoja:hoja`, answered by `UserPromptExpansion` |
| Session entries | `${CLAUDE_PLUGIN_DATA}/sessions/<id>.jsonl` plus the Claude transcript |
| — (tracing is plugin-only) | `SubagentStart`/`SubagentStop`, `PreCompact`/`PostCompact`, `Notification`, `StopFailure`, `PermissionDenied` → recorder; `SessionEnd` → `dist/trace-hook.mjs` (a command hook, because the MCP server may already be gone) |

### Deviations from Trebol

The vendored code decides everything; the adapter only widens or re-routes four things Claude Code does differently.
Each one is covered by a test in `test/reported-bugs.test.ts`.

| Area | Trebol | Here | Why |
| --- | --- | --- | --- |
| Schema loading | — | `ToolSearch` is never gated | Claude Code defers MCP tools behind `ToolSearch`; gating it could make the gate's only exit (TaskManage) unreachable. |
| Read-only discovery | its own read tools (`hoja_list`, `hoja_get`, context, history, vault list/get) | also the hosted Hoja API's read tools (`hoja_viewer`, `hoja_workspace`, `hoja_teams`, `hoja_issues`, `hoja_projects`, `hoja_cycles`, `hoja_workflowStates`, `hoja_*Decisions`, inbox, labels, `hoja_extensionActions`, …), `hoja_project action:list` and `hoja_setup` | Trebol never sees the hosted API, so the gate refused a health check until an issue was filed. Writes (`hoja_issueCreate`, `hoja_taskUpdate`, `hoja_commentCreate`, `hoja_extensionActionRun`, `hoja_notificationMarkRead`, every `*Answer`/`*Update`/`*Delete`) stay gated. |
| Read-only Bash | `isBashReadOnly` over its tokenizer | the same call after dropping pure file-descriptor redirections (`2>&1`, `>&2`, `>/dev/null`, `&>/dev/null`) | Trebol's tokenizer reads the `&` in `2>&1` as a command separator, so `cat file 2>&1` looked like two commands. Redirects to real files are untouched, and Trebol's allowlist stays conservative (`|| true` is still not read-only). |
| Slash commands | `/tasks`, `/hoja` are Pi commands | `UserPromptExpansion` (any spelling of the command name) **and** a `UserPromptSubmit` fallback, plus the `hoja_setup` tool for the `.md` fallback | Claude Code fails a hook open when its plugin server is not connected; the command text then reached the model. Three independent paths now answer it. |
| Published issue content | `createIssue(title, description)` — no priority | the task's description is put at the head of the issue body when the create operation omitted it, and its priority is written with one `issueUpdate` after the create | `IssueCreateInput.priority` was never populated, so every issue kept Hoja's default. Only the create path is touched: Trebol's later description writes are proved by exact read-back, so a description added to a task *after* its issue exists still stays local (upstream behaviour). |


## Verify it yourself

```bash
git clone https://github.com/hoja-work/hoja-claude-plugin && cd hoja-claude-plugin
npm ci
npm run vendor:check   # 53 vendored files match vendor/MANIFEST.json (SHA-256)
npm test               # Trebol's own 25 suites, unmodified, plus the adapter, trace and Antigravity tests: 401 tests
npm run validate       # claude plugin validate . (also passes with --strict)
npm run eval           # live: the gate blocks an untasked write, the agent recovers, and plain questions create no tasks
```

To run the working tree directly: `claude --plugin-dir .`.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `/hoja:setup` prints the command's fallback text | The hook could not run. The fallback now calls the read-only `hoja_setup` tool, so the report still prints when only the hook failed; if the tool is missing too, the server is down: `claude --debug=hooks,mcp` shows `MCP server "plugin:hoja:hoja"` and `Hook UserPromptExpansion`. |
| A read-only tool was refused by the gate | Read tools of the hosted API and `hoja_project action:list` are exempt. A tool that is not on that list (or a shell command Trebol's allowlist does not know) is gated by design — set `task_enforcement` to `advise`, or use plain `ls`/`cat`/`grep`/`git log` forms. |
| `hoja-api` serves no tools | No endpoint or token is configured. The tool list says which variable is missing. |
| Every write is blocked | That is the gate working. Ask Claude to create and focus a task, or set `task_enforcement` to `advise`. |
| Tasks are not published | Run `/hoja:hoja status` and `/hoja:setup`. Publication needs a token and a resolvable project. |
| Every Hoja call fails with `Failed to parse URL` (0.3.1) | The endpoint setting was saved without `https://`. 0.4.0 repairs it; on 0.3.1, re-enter it with `/plugin configure hoja@hoja`. |
| No trace was attached | Only tasks linked to an issue get one (a task with `{"hoja":"local"}` stays local), once per task. `/hoja:trace` shows the upload status; `/hoja:trace upload HOJA-123` attaches it by hand. |

## Development

```text
src/            adapter: MCP server, hook bridge, Pi shim, transcript reader, API proxy
src/trace/      session traces: recorder, builder, redaction, upload, /hoja:trace
vendor/trebol/  Trebol files, byte-for-byte (never edit; re-vendor instead)
dist/           bundled entry points (committed, because plugins run without a build step)
hooks/          hooks.json — every event is forwarded to the server's __hoja_hook tool
commands/       fallback text for /hoja:* (normally answered by the hook)
evals/          claude plugin eval cases
test/           adapter tests (Claude and Codex hosts)
```

To re-vendor from a Trebol checkout, run `TREBOL_ROOT=~/src/trebol npm run vendor && npm run build && npm test`.

The [Codex plugin](https://github.com/hoja-work/hoja-codex-plugin) has the same adapter source, selected with
`HOJA_PLUGIN_HOST=codex`.

## License

[MIT](LICENSE). `vendor/trebol/` is unmodified code from
[cloverinternational/trebol](https://github.com/cloverinternational/trebol). See [NOTICE](NOTICE).
