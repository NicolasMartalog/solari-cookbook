import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { neon } from "@neondatabase/serverless"
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

type Sql = ReturnType<typeof neon>

function sql(): Sql | null {
  const url = process.env.DATABASE_URL
  if (!url) return null
  return neon(url)
}

function readFileRows(path: string): RunRecord[] {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as RunRecord[]
  } catch {
    return []
  }
}

function writeFileLive(rows: RunRecord[]) {
  const seededIds = new Set(readFileRows(SEEDED).map((r) => r.id))
  const live = rows.filter((r) => !seededIds.has(r.id))
  mkdirSync(dirname(DATA), { recursive: true })
  writeFileSync(DATA, JSON.stringify(live, null, 2))
}

function fromRow(r: Record<string, unknown>): RunRecord {
  return {
    id: String(r.id),
    kind: r.kind as RunKind,
    source: String(r.source),
    status: r.status as RunStatus,
    verdict: (r.verdict as Verdict | null) ?? null,
    message: r.message ? String(r.message) : undefined,
    payload: (r.payload as Record<string, unknown>) ?? {},
    createdAt: new Date(String(r.created_at ?? r.createdAt)).toISOString(),
    updatedAt: new Date(String(r.updated_at ?? r.updatedAt)).toISOString(),
  }
}

async function readLive(): Promise<RunRecord[]> {
  const db = sql()
  if (!db) return readFileRows(DATA)
  const rows = (await db`SELECT id, kind, source, status, verdict, message, payload, created_at, updated_at FROM runs`) as Record<string, unknown>[]
  return rows.map(fromRow)
}

async function upsertLive(row: RunRecord) {
  const db = sql()
  if (!db) {
    const rows = readFileRows(DATA)
    const i = rows.findIndex((r) => r.id === row.id)
    if (i >= 0) rows[i] = row
    else rows.push(row)
    writeFileLive(rows)
    return
  }
  await db`
    INSERT INTO runs (id, kind, source, status, verdict, message, payload, created_at, updated_at)
    VALUES (
      ${row.id},
      ${row.kind},
      ${row.source},
      ${row.status},
      ${row.verdict},
      ${row.message ?? null},
      ${JSON.stringify(redactSecrets(row.payload))}::jsonb,
      ${row.createdAt}::timestamptz,
      ${row.updatedAt}::timestamptz
    )
    ON CONFLICT (id) DO UPDATE SET
      kind = EXCLUDED.kind,
      source = EXCLUDED.source,
      status = EXCLUDED.status,
      verdict = EXCLUDED.verdict,
      message = EXCLUDED.message,
      payload = EXCLUDED.payload,
      updated_at = EXCLUDED.updated_at
  `
}

export async function createRun(partial: Pick<RunRecord, "kind" | "source">): Promise<RunRecord> {
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
  await upsertLive(row)
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

export async function getRun(id: string): Promise<RunRecord | undefined> {
  const db = sql()
  if (db) {
    const rows = (await db`
      SELECT id, kind, source, status, verdict, message, payload, created_at, updated_at
      FROM runs WHERE id = ${id} LIMIT 1
    `) as Record<string, unknown>[]
    if (rows[0]) return redactSecrets(fromRow(rows[0])) as RunRecord
  } else {
    const live = readFileRows(DATA).find((r) => r.id === id)
    if (live) return redactSecrets(live) as RunRecord
  }
  const seeded = readFileRows(SEEDED).find((r) => r.id === id)
  return seeded ? (redactSecrets(seeded) as RunRecord) : undefined
}

export async function updateRun(id: string, patch: Partial<RunRecord>): Promise<RunRecord> {
  const cur = await getRun(id)
  if (!cur) throw new Error(`run ${id} not found`)
  const next: RunRecord = {
    ...cur,
    ...patch,
    id,
    payload: patch.payload ?? cur.payload,
    updatedAt: new Date().toISOString(),
  }
  await upsertLive(next)
  return next
}

export async function hasRunningGithub(): Promise<boolean> {
  const db = sql()
  if (db) {
    const rows = (await db`
      SELECT 1 FROM runs
      WHERE kind IN ('github', 'fixture')
        AND status IN ('queued', 'running')
      LIMIT 1
    `) as unknown[]
    return rows.length > 0
  }
  return readFileRows(DATA).some(
    (r) =>
      (r.kind === "github" || r.kind === "fixture") &&
      (r.status === "running" || r.status === "queued"),
  )
}

export function listSeededRuns(): RunRecord[] {
  return readFileRows(SEEDED).filter((r) => r.status === "done" && r.verdict)
}
