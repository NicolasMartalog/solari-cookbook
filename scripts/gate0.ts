/**
 * Gate 0 — prove this Starter key can: sandbox + public preview + recorded browser.
 * Kill the VM in finally. Commands are not a shell. Replay upload is async.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { Solari } from "@solarisdk/browser"
import { SolariClient } from "@solarisdk/sdk"

function loadDotenv() {
  try {
    const text = readFileSync(".env", "utf8")
    for (const line of text.split("\n")) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue
      const eq = trimmed.indexOf("=")
      if (eq < 1) continue
      const key = trimmed.slice(0, eq)
      const val = trimmed.slice(eq + 1).trim()
      if (!process.env[key]) process.env[key] = val
    }
  } catch {
    /* .env optional if the shell already exported the key */
  }
}

loadDotenv()
const apiKey = process.env.SOLARI_API_KEY
if (!apiKey) throw new Error("SOLARI_API_KEY missing")

const PORT = 3000
const pt = new SolariClient({ apiKey })
const solari = new Solari({ apiKey })

console.log("creating sandbox…")
const sandbox = await pt.sandboxes.create({
  template: "base",
  timeoutMs: 5 * 60_000,
})
console.log("sandbox:", sandbox.sandboxId)

try {
  await sandbox.connect()
  await sandbox.files.write(
    "/tmp/site/index.html",
    `<!doctype html>
<html>
  <body>
    <h1>First User gate0</h1>
    <button id="go">Go</button>
  </body>
</html>
`,
  )
  await sandbox.commands.run("sh", {
    args: [
      "-c",
      `cd /tmp/site && nohup python3 -m http.server ${PORT} >/dev/null 2>&1 &`,
    ],
  })

  let preview: { url: string }
  try {
    preview = await sandbox.previewUrl(PORT)
  } catch (err) {
    console.error("previewUrl failed — if this is 501, preview domain is off on the account")
    throw err
  }
  console.log("preview:", preview.url)

  let html = ""
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 1000))
    const res = await fetch(preview.url)
    console.log("preview poll", res.status)
    if (res.ok) {
      html = await res.text()
      break
    }
  }
  if (!html.includes("First User gate0")) {
    throw new Error(
      "preview never served our HTML — if you saw 501, preview is not configured",
    )
  }

  const browser = await solari.launch({ recording: true })
  const sessionId = browser.id
  console.log("browser session:", sessionId)
  try {
    const page = await browser.newPage()
    await page.goto(preview.url, { waitUntil: "domcontentloaded", timeout: 30_000 })
    const h1 = await page.locator("h1").innerText()
    console.log("browser h1:", h1)
    mkdirSync("scripts/out", { recursive: true })
    writeFileSync("scripts/out/gate0.png", await page.screenshot({ type: "png" }))
    console.log("wrote scripts/out/gate0.png")
    // rrweb batches events; cookbook: sleep before close or the replay 404s forever
    await new Promise((r) => setTimeout(r, 2000))
  } finally {
    await browser.close()
  }

  await solari.sessions.releaseAndWait(sessionId).catch(() => undefined)
  for (let i = 1; i <= 10; i++) {
    await new Promise((r) => setTimeout(r, 3000))
    try {
      const replay = await solari.sessions.getReplayUrl(sessionId)
      console.log("replay:", replay.url, "expiresIn", replay.expiresInSeconds)
      break
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.log("replay poll", i, msg.slice(0, 160))
    }
  }
} finally {
  await sandbox.kill()
  await solari.close()
}
console.log("gate0 ok")
