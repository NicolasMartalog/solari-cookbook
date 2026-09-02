import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import type { Verdict } from "./verdict"

export type RunStatus = "queued" | "running" | "done" | "busy"
export type RunKind = "github" | "url" | "fixture"

export type RunRecord = {
  id: string
  kind: RunKind
  source: string
  status: RunStatus
  verdict: Verdict | null
  message?: string
  payload: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

const DATA = join(process.cwd(), "data", "runs.json")
const SEEDED = join(process.cwd(), "seeded", "runs.json")

function readFileRows(path: string): RunRecord[] {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as RunRecord[]
  } catch {
    return []
  }
}

function readAll(): RunRecord[] {
  const live = readFileRows(DATA)
  const ids = new Set(live.map((r) => r.id))
  return [...live, ...readFileRows(SEEDED).filter((r) => !ids.has(r.id))]
}

function writeAll(rows: RunRecord[]) {
  const seededIds = new Set(readFileRows(SEEDED).map((r) => r.id))
  const live = rows.filter((r) => !seededIds.has(r.id))
  mkdirSync(dirname(DATA), { recursive: true })
  writeFileSync(DATA, JSON.stringify(live, null, 2))
}

export function createRun(partial: Pick<RunRecord, "kind" | "source">): RunRecord {
  const now = new Date().toISOString()
  const row: RunRecord = {
    id: crypto.randomUUID(),
    kind: partial.kind,
    source: partial.source,
    status: "queued",
    verdict: null,
    payload: {},
    createdAt: now,
    updatedAt: now,
  }
  const rows = readAll()
  rows.push(row)
  writeAll(rows)
  return row
}

function redactSecrets(value: unknown): unknown {
  if (typeof value === "string") {
    return value.replace(/pt_token=[^&\s"]+/g, "pt_token=redacted")
  }
  if (Array.isArray(value)) return value.map(redactSecrets)
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, redactSecrets(v)]),
    )
  }
  return value
}

export function getRun(id: string): RunRecord | undefined {
  const row = readAll().find((r) => r.id === id)
  return row ? (redactSecrets(row) as RunRecord) : undefined
}

export function updateRun(id: string, patch: Partial<RunRecord>): RunRecord {
  const rows = readAll()
  const i = rows.findIndex((r) => r.id === id)
  if (i < 0) throw new Error(`run ${id} not found`)
  rows[i] = { ...rows[i], ...patch, id, updatedAt: new Date().toISOString() }
  writeAll(rows)
  return rows[i]
}

export function hasRunningGithub(): boolean {
  return readAll().some(
    (r) =>
      (r.kind === "github" || r.kind === "fixture") &&
      (r.status === "running" || r.status === "queued"),
  )
}

export function listSeededRuns(): RunRecord[] {
  return readFileRows(SEEDED).filter((r) => r.status === "done" && r.verdict)
}
