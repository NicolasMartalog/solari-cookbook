import { after } from "next/server"
import { createRun, listSeededRuns, updateRun } from "@/src/lib/db"
import { rateLimitLive, rateLimitRepo, tryAcquireRepoLock } from "@/src/lib/locks"
import { parseSource } from "@/src/lib/parse-source"
import { runJob } from "@/src/lib/run-job"

export const runtime = "nodejs"
export const maxDuration = 300

function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local"
}

function resolveRelative(source: string, origin: string) {
  if (source.startsWith("/")) return new URL(source, origin).href
  return source
}

export async function POST(req: Request) {
  const origin = new URL(req.url).origin
  const ip = clientIp(req)
  const body = (await req.json().catch(() => null)) as { source?: string } | null
  const raw = resolveRelative(body?.source ?? "", origin)
  const parsed = parseSource(raw, {
    allowLocal: process.env.NODE_ENV !== "production",
  })
  if (parsed.kind === "reject") {
    return Response.json({ error: parsed.reason }, { status: 400 })
  }

  const seeded = listSeededRuns()
  const busyHint =
    seeded.length > 0
      ? `Sandbox busy — open a seeded report (${seeded.map((r) => `/r/${r.id}`).join(", ")}) or paste a live URL`
      : "Sandbox busy — try a live URL or wait a minute"

  if (parsed.kind === "github" || parsed.kind === "fixture") {
    if (!rateLimitRepo(ip)) {
      return Response.json({ error: "Repo rate limit: 1 per hour from this IP" }, { status: 429 })
    }
    if (!tryAcquireRepoLock()) {
      const busy = createRun({
        kind: parsed.kind === "fixture" ? "fixture" : "github",
        source: raw,
      })
      updateRun(busy.id, {
        status: "busy",
        verdict: "INCONCLUSIVE",
        message: busyHint,
      })
      return Response.json({ id: busy.id, status: "busy" })
    }
    const run = createRun({
      kind: parsed.kind === "fixture" ? "fixture" : "github",
      source: raw,
    })
    updateRun(run.id, {
      payload:
        parsed.kind === "github"
          ? { cloneUrl: parsed.cloneUrl, branch: parsed.branch, logs: [] }
          : { fixture: parsed.name, logs: [] },
    })
    after(() => runJob(run.id).catch((err) => console.error(err)))
    return Response.json({ id: run.id })
  }

  if (!rateLimitLive(ip)) {
    return Response.json({ error: "Live URL rate limit: 3 per hour from this IP" }, { status: 429 })
  }
  const run = createRun({ kind: "url", source: parsed.href })
  after(() => runJob(run.id).catch((err) => console.error(err)))
  return Response.json({ id: run.id })
}
