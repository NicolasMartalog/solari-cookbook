import { readFileSync } from "node:fs"
import { join } from "node:path"
import { Solari } from "@solarisdk/browser"
import { SolariClient } from "@solarisdk/sdk"
import { BootError, bootRepo, bootStaticFiles } from "./boot"
import { getRun, updateRun } from "./db"
import { requireSolariKey } from "./env"
import type { FixtureName } from "./parse-source"
import { decideVerdict } from "./verdict"
import { walkUrl } from "./walk"

function fixtureHtml(name: FixtureName): string {
  return readFileSync(join(process.cwd(), "demo", name, "index.html"), "utf8")
}

export async function runJob(id: string) {
  const run = await getRun(id)
  if (!run) throw new Error(`run ${id} missing`)
  const logs: string[] = []
  let logChain = Promise.resolve()
  const onLog = (line: string) => {
    logs.push(line)
    logChain = logChain.then(async () => {
      const cur = await getRun(id)
      await updateRun(id, { payload: { ...(cur?.payload ?? {}), logs } })
    })
  }

  const apiKey = requireSolariKey()
  const solari = new Solari({ apiKey })
  const pt = new SolariClient({ apiKey })
  let sandbox: { kill(): Promise<void> } | undefined

  try {
    await updateRun(id, { status: "running" })
    let target = run.source
    let setup: Record<string, unknown> = {}

    if (run.kind === "github") {
      onLog("booting repo in Solari sandbox")
      const source = run.payload.cloneUrl as string
      const branch = run.payload.branch as string | undefined
      const boot = await bootRepo({ pt, cloneUrl: source, branch, onLog })
      sandbox = boot.sandbox
      target = boot.previewUrl
      setup = { previewUrl: boot.previewUrl, port: boot.port, startCommand: boot.startCommand }
    } else if (run.kind === "fixture") {
      const name = (run.payload.fixture as FixtureName) ?? "ok-app"
      onLog(`booting fixture ${name} in Solari sandbox`)
      const boot = await bootStaticFiles({
        pt,
        files: { "index.html": fixtureHtml(name) },
        onLog,
      })
      sandbox = boot.sandbox
      target = boot.previewUrl
      setup = { previewUrl: boot.previewUrl, port: boot.port, startCommand: boot.startCommand, fixture: name }
    }

    onLog(`walking ${target}`)
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
    await logChain
    await updateRun(id, {
      status: "done",
      verdict,
      payload: {
        logs,
        setup,
        walk,
        bugs: {
          pageErrors: walk.pageErrors,
          action5xx: walk.action5xx,
          deadPrimary: walk.deadPrimary,
        },
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const extra = err instanceof BootError ? err.logs : logs.join("\n")
    onLog(message)
    await logChain
    await updateRun(id, {
      status: "done",
      verdict: "INCONCLUSIVE",
      message,
      payload: { logs, bootFailed: true, extra },
    })
  } finally {
    await sandbox?.kill().catch(() => undefined)
    await solari.close().catch(() => undefined)
  }
}
