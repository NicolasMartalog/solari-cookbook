import type { Solari } from "@solarisdk/browser"
import type { Page } from "patchright-core"
import { shortPageRef } from "./display"

export type WalkStep = {
  at: string
  action: string
  note: string
  screenshotJpeg?: string
}

export type WalkResult = {
  loaded200: boolean
  nonempty: boolean
  realInteraction: boolean
  pageErrors: number
  action5xx: number
  deadPrimary: number
  loginWall: boolean
  steps: WalkStep[]
  replayUrl?: string
  sessionId: string
}

async function jpeg(page: Page): Promise<string> {
  const buf = await page.screenshot({ type: "jpeg", quality: 55 })
  return buf.toString("base64")
}

function fingerprint(page: Page) {
  return page.evaluate(() => `${location.href}\n${document.body?.innerText?.slice(0, 2000) ?? ""}`)
}

export async function walkUrl(solari: Solari, url: string): Promise<WalkResult> {
  const steps: WalkStep[] = []
  let pageErrors = 0
  let action5xx = 0
  let deadPrimary = 0
  let realInteraction = false
  let loaded200 = false
  let nonempty = false
  let loginWall = false

  const browser = await solari.launch({ recording: true })
  const sessionId = browser.id
  try {
    const page = await browser.newPage()
    page.on("pageerror", () => {
      pageErrors += 1
    })
    page.on("response", (res) => {
      if (res.status() >= 500) action5xx += 1
    })

    const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 })
    loaded200 = Boolean(res && res.ok())
    const text = (await page.locator("body").innerText().catch(() => "")).trim()
    nonempty = text.length > 0
    steps.push({
      at: new Date().toISOString(),
      action: "goto",
      note: `opened ${shortPageRef(url)} (${res?.status() ?? "no status"})`,
      screenshotJpeg: await jpeg(page),
    })

    const lower = text.toLowerCase()
    const hasPassword = (await page.locator('input[type="password"]').count()) > 0
    if (hasPassword && /log in|sign in|authorize/.test(lower)) {
      loginWall = true
      steps.push({
        at: new Date().toISOString(),
        action: "done",
        note: "login wall — v1 does not authenticate",
        screenshotJpeg: await jpeg(page),
      })
    } else {
      const deadline = Date.now() + 90_000
      for (let i = 0; i < 8 && Date.now() < deadline; i++) {
        const before = await fingerprint(page)
        const button = page.locator("button:visible, a:visible, [role=button]:visible").first()
        const count = await page.locator("button:visible, a:visible, [role=button]:visible").count()
        if (count === 0) {
          steps.push({
            at: new Date().toISOString(),
            action: "done",
            note: "no visible controls left",
          })
          break
        }
        const label = ((await button.innerText().catch(() => "")) || "control").trim().slice(0, 80)
        await button.click({ timeout: 5000 }).catch(() => undefined)
        await page.waitForTimeout(800)
        const after = await fingerprint(page)
        const changed = after !== before
        if (changed) realInteraction = true
        else deadPrimary += 1
        steps.push({
          at: new Date().toISOString(),
          action: "click",
          note: changed
            ? `clicked “${label}” and the page changed`
            : `clicked “${label}” — nothing happened`,
          screenshotJpeg: await jpeg(page),
        })
        break
      }
    }

    await page.waitForTimeout(2000)
  } finally {
    await browser.close()
  }

  await solari.sessions.releaseAndWait(sessionId).catch(() => undefined)
  let replayUrl: string | undefined
  const replayTries = process.env.VERCEL ? 2 : 10
  const replayWaitMs = process.env.VERCEL ? 1500 : 3000
  for (let i = 0; i < replayTries; i++) {
    await new Promise((r) => setTimeout(r, replayWaitMs))
    try {
      const replay = await solari.sessions.getReplayUrl(sessionId)
      replayUrl = replay.url
      break
    } catch {
      /* 404 until upload finishes */
    }
  }

  return {
    loaded200,
    nonempty,
    realInteraction,
    pageErrors,
    action5xx,
    deadPrimary,
    loginWall,
    steps,
    replayUrl,
    sessionId,
  }
}
