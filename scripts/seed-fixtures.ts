import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { Solari } from "@solarisdk/browser"
import { SolariClient } from "@solarisdk/sdk"
import { bootStaticFiles } from "../src/lib/boot"
import type { RunRecord } from "../src/lib/db"
import { loadDotenv, requireSolariKey } from "../src/lib/env"
import { decideVerdict } from "../src/lib/verdict"
import { walkUrl } from "../src/lib/walk"

loadDotenv()

function html(name: string) {
  return readFileSync(join(process.cwd(), "demo", name, "index.html"), "utf8")
}

function withPath(previewUrl: string, pathname: string) {
  const u = new URL(previewUrl)
  u.pathname = pathname
  return u.href
}

function now() {
  return new Date().toISOString()
}

async function main() {
  const apiKey = requireSolariKey()
  const pt = new SolariClient({ apiKey })
  const solari = new Solari({ apiKey })
  const bootLogs: string[] = []
  const onBootLog = (line: string) => {
    bootLogs.push(line)
    console.log(line)
  }

  const boot = await bootStaticFiles({
    pt,
    files: {
      "index.html": "<!doctype html><title>fixtures</title><p>First User fixtures</p>",
      "ok-app/index.html": html("ok-app"),
      "broken-button/index.html": html("broken-button"),
    },
    onLog: onBootLog,
  })

  const rows: RunRecord[] = []
  try {
    for (const spec of [
      { name: "ok-app", expect: "PASS" as const },
      { name: "broken-button", expect: "FAIL" as const },
    ]) {
      const id = crypto.randomUUID()
      const source = `fixture:${spec.name}`
      const createdAt = now()
      const target = withPath(boot.previewUrl, `/${spec.name}/`)
      const runLogs = [
        ...bootLogs,
        `walking ${spec.name}`,
      ]
      console.log(`walking ${spec.name} ${target}`)
      const walk = await walkUrl(solari, target)
      const verdict = decideVerdict({
        loaded200: walk.loaded200,
        nonempty: walk.nonempty,
        realInteraction: walk.realInteraction,
        pageErrors: walk.pageErrors,
        action5xx: walk.action5xx,
        deadPrimary: walk.deadPrimary,
        bootFailed: false,
        loginWall: walk.loginWall,
      })
      runLogs.push(`${spec.name} verdict=${verdict} (want ${spec.expect})`)
      console.log(runLogs[runLogs.length - 1])
      rows.push({
        id,
        kind: "fixture",
        source,
        status: "done",
        verdict,
        payload: {
          logs: runLogs,
          setup: {
            previewUrl: boot.previewUrl,
            port: boot.port,
            startCommand: boot.startCommand,
            fixture: spec.name,
          },
          walk,
          bugs: {
            pageErrors: walk.pageErrors,
            action5xx: walk.action5xx,
            deadPrimary: walk.deadPrimary,
          },
        },
        createdAt,
        updatedAt: now(),
      })
    }
  } finally {
    await boot.sandbox.kill().catch(() => undefined)
    await solari.close().catch(() => undefined)
  }

  mkdirSync("seeded", { recursive: true })
  const scrubbed = JSON.parse(
    JSON.stringify(rows).replace(/pt_token=[^&\s"]+/g, "pt_token=redacted"),
  )
  writeFileSync("seeded/runs.json", JSON.stringify(scrubbed, null, 2))
  const pass = rows.find((r) => r.verdict === "PASS")
  const fail = rows.find((r) => r.verdict === "FAIL")
  console.log("seeded PASS", pass?.id ?? "missing")
  console.log("seeded FAIL", fail?.id ?? "missing")
  if (!pass || !fail) {
    process.exitCode = 1
    console.error("seed did not produce both PASS and FAIL")
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
