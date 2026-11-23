/**
 * SessionEnd command hook: finish the session's trace and, depending on `trace_upload`, attach it to Hoja.
 *
 * A command hook, not an mcp_tool hook: the docs do not promise the plugin's MCP server is still connected at
 * SessionEnd, and observational events do not wait for it. This process rebuilds the same state from disk (task
 * journal + hook records + transcript), so it needs nothing from the server. hooks.json gives it a 30 s timeout;
 * Claude Code's default SessionEnd budget is 1.5 s shared by every hook.
 *
 *   completion   (default) catch up: attach to completed, linked tasks whose upload never happened
 *   session-end  also attach the final trace to every issue this session's tasks are linked to
 *   manual, off  only save the trace locally
 */
import { readFileSync } from "node:fs";
import { applyCredentials, dataDir, traceDetail, traceUpload } from "./env.ts";
import { createRuntime } from "./runtime.ts";
import { hojaLinks } from "./trace/collect.ts";
import { TraceRecorder } from "./trace/recorder.ts";
import { readLedger } from "./trace/upload.ts";

export async function sessionEnd(input: { session_id?: string; transcript_path?: string; cwd?: string; reason?: string }, env: NodeJS.ProcessEnv = process.env): Promise<string[]> {
	const sessionId = input.session_id;
	if (!sessionId) return [];
	const dir = dataDir(env);
	new TraceRecorder({ dataDir: dir, detail: traceDetail(env) }).record(sessionId, "SessionEnd", input);
	const mode = traceUpload(env);
	// The same registrations the server performs, replayed from the journal: tasks and Hoja links, no network.
	const { shim, traces } = createRuntime({ dataDir: dir, cwd: input.cwd || process.cwd(), hoja: false, trace: { upload: mode, detail: traceDetail(env), env } });
	await shim.bindSession(sessionId, input.transcript_path, input.cwd);
	const out: string[] = [];
	const summary = await traces.run("path");
	out.push(`trace saved: ${summary}`);
	if (mode === "off" || mode === "manual" || traces.uploadProblem()) return out;
	out.push(...await traces.afterTaskManage());
	if (mode === "session-end") {
		const done = new Set(readLedger(dir, sessionId).filter(e => e.reason === "session-end").map(e => e.issue));
		for (const issue of new Set(hojaLinks(shim.branch()).values())) {
			if (done.has(issue)) continue;
			try { await traces.upload(issue, "session-end"); out.push(`trace attached to ${issue}`); }
			catch (error) { out.push(`trace not attached to ${issue}: ${(error as Error).message}`); }
		}
	}
	return out;
}

async function main() {
	// The same credential resolution as the server: userConfig, the environment, then `hoja auth login`.
	applyCredentials();
	let input: any = {};
	try { input = JSON.parse(readFileSync(0, "utf8") || "{}"); } catch { /* nothing to do */ }
	const lines = await sessionEnd(input);
	if (process.env.HOJA_DEBUG_LOG) process.stderr.write(lines.join("\n") + "\n");
}
if (process.argv[1] && /trace-hook\.(m?js|ts)$/.test(process.argv[1])) main().catch(error => { process.stderr.write(`[hoja] trace: ${error?.message ?? error}\n`); process.exit(0); });
