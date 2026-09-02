import type { SolariClient } from "@solarisdk/sdk"
import type { SessionHandle } from "@solarisdk/core"

export class BootError extends Error {
  logs: string
  constructor(message: string, logs = "") {
    super(message)
    this.name = "BootError"
    this.logs = logs
  }
}

export type BootResult = {
  sandbox: SessionHandle
  previewUrl: string
  port: number
  startCommand: string
}

async function pollPreview(url: string, onLog: (l: string) => void): Promise<boolean> {
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 1000))
    try {
      const res = await fetch(url)
      onLog(`preview poll ${res.status}`)
      if (res.ok) return true
    } catch (e) {
      onLog(`preview poll error ${e instanceof Error ? e.message : String(e)}`)
    }
  }
  return false
}

async function exists(sandbox: SessionHandle, path: string): Promise<boolean> {
  try {
    await sandbox.files.stat(path)
    return true
  } catch {
    return false
  }
}

export async function bootRepo(opts: {
  pt: SolariClient
  cloneUrl: string
  branch?: string
  onLog: (line: string) => void
}): Promise<BootResult> {
  const { pt, cloneUrl, branch, onLog } = opts
  const sandbox = await pt.sandboxes.create({
    template: "base",
    timeoutMs: 10 * 60_000,
    lifecycle: { onTimeout: "kill" },
  })
  const logs: string[] = []
  const log = (line: string) => {
    logs.push(line)
    onLog(line)
  }

  try {
    await sandbox.connect()
    log("cloning")
    await sandbox.git.clone(cloneUrl, {
      path: "/work/app",
      depth: 1,
      branch,
    })

    let root = "/work/app"
    if (!(await exists(sandbox, `${root}/package.json`)) && (await exists(sandbox, `${root}/apps/web/package.json`))) {
      root = "/work/app/apps/web"
    }

    const port = 3000
    let startCommand = `python3 -m http.server ${port}`

    if (await exists(sandbox, `${root}/package.json`)) {
      const pkgRaw = await sandbox.files.readText(`${root}/package.json`)
      const pkg = JSON.parse(pkgRaw) as { scripts?: Record<string, string> }
      const pm = (await exists(sandbox, `${root}/pnpm-lock.yaml`))
        ? "pnpm"
        : (await exists(sandbox, `${root}/yarn.lock`))
          ? "yarn"
          : "npm"
      log(`installing with ${pm}`)
      const install = await sandbox.commands.run("sh", {
        args: ["-c", pm === "npm" ? "npm install --omit=dev" : `${pm} install`],
        cwd: root,
        timeoutMs: 3 * 60_000,
      })
      if (install.exitCode !== 0) {
        throw new BootError(`install failed: ${install.stderr.slice(0, 800)}`, logs.join("\n"))
      }
      const script = pkg.scripts?.dev ? "dev" : pkg.scripts?.start ? "start" : null
      if (!script) {
        throw new BootError("no npm dev/start script", logs.join("\n"))
      }
      startCommand = `${pm} run ${script}`
      log(`starting ${startCommand}`)
      await sandbox.commands.run("sh", {
        args: ["-c", `nohup env PORT=${port} ${startCommand} >/tmp/app.log 2>&1 &`],
        cwd: root,
      })
    } else if (await exists(sandbox, `${root}/index.html`)) {
      log("static index.html — python http.server")
      await sandbox.commands.run("sh", {
        args: ["-c", `cd ${root} && nohup python3 -m http.server ${port} >/tmp/app.log 2>&1 &`],
      })
    } else {
      throw new BootError(
        "v1 only boots Node web apps or a root index.html — paste a live URL instead",
        logs.join("\n"),
      )
    }

    const preview = await sandbox.previewUrl(port)
    log(`preview ${preview.url}`)
    const ok = await pollPreview(preview.url, log)
    if (!ok) throw new BootError("preview never became ready", logs.join("\n"))
    return { sandbox, previewUrl: preview.url, port, startCommand }
  } catch (err) {
    await sandbox.kill().catch(() => undefined)
    if (err instanceof BootError) throw err
    throw new BootError(err instanceof Error ? err.message : String(err), logs.join("\n"))
  }
}

export async function bootStaticFiles(opts: {
  pt: SolariClient
  files: Record<string, string>
  onLog: (line: string) => void
}): Promise<BootResult> {
  const { pt, files, onLog } = opts
  const sandbox = await pt.sandboxes.create({
    template: "base",
    timeoutMs: 10 * 60_000,
    lifecycle: { onTimeout: "kill" },
  })
  const logs: string[] = []
  const log = (line: string) => {
    logs.push(line)
    onLog(line)
  }
  const port = 3000
  const startCommand = `python3 -m http.server ${port}`

  try {
    await sandbox.connect()
    for (const [rel, content] of Object.entries(files)) {
      const path = `/tmp/site/${rel.replace(/^\//, "")}`
      await sandbox.files.write(path, content)
    }
    log("static files — python http.server")
    await sandbox.commands.run("sh", {
      args: ["-c", `cd /tmp/site && nohup python3 -m http.server ${port} >/tmp/app.log 2>&1 &`],
    })
    const preview = await sandbox.previewUrl(port)
    log(`preview ${preview.url}`)
    const ok = await pollPreview(preview.url, log)
    if (!ok) throw new BootError("preview never became ready", logs.join("\n"))
    return { sandbox, previewUrl: preview.url, port, startCommand }
  } catch (err) {
    await sandbox.kill().catch(() => undefined)
    if (err instanceof BootError) throw err
    throw new BootError(err instanceof Error ? err.message : String(err), logs.join("\n"))
  }
}
