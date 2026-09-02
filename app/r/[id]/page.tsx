"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { receiptSteps } from "@/src/lib/display"

type Run = {
  id: string
  status: string
  verdict: string | null
  message?: string
  source: string
  payload: {
    logs?: string[]
    walk?: {
      steps?: Array<{ action: string; note: string; screenshotJpeg?: string }>
      replayUrl?: string
      pageErrors?: number
      action5xx?: number
      deadPrimary?: number
    }
    bugs?: { pageErrors: number; action5xx: number; deadPrimary: number }
    setup?: { previewUrl?: string; startCommand?: string; port?: number }
  }
}

function summary(run: Run): string {
  if (run.status === "queued" || run.status === "running") {
    return "A Solari browser is using this app now."
  }
  if (run.verdict === "PASS") return "A stranger could use the first control."
  if (run.verdict === "FAIL" && (run.payload.bugs?.deadPrimary ?? 0) > 0) {
    return "The first control did nothing."
  }
  if (run.verdict === "FAIL") return "The walk hit an error."
  if (run.message) return run.message
  return "The walk could not finish."
}

export default function ReportPage() {
  const params = useParams<{ id: string }>()
  const [run, setRun] = useState<Run | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let stop = false
    async function tick() {
      const res = await fetch(`/api/runs/${params.id}`)
      if (!res.ok) {
        setError("This receipt does not exist. Return home and paste a URL.")
        return
      }
      const body = (await res.json()) as Run
      if (!stop) setRun(body)
      if (body.status === "running" || body.status === "queued") {
        setTimeout(tick, 1500)
      }
    }
    tick()
    return () => {
      stop = true
    }
  }, [params.id])

  if (error) {
    return (
      <main id="content" className="page">
        <p className="error" role="alert">
          {error}
        </p>
        <p>
          <a href="/">Return home</a>
        </p>
      </main>
    )
  }

  if (!run) {
    return (
      <main id="content" className="page">
        <div className="skel" aria-hidden="true">
          <div />
          <div className="lg" />
          <div />
          <div />
        </div>
        <p className="lede">Loading receipt…</p>
      </main>
    )
  }

  const walk = run.payload.walk
  const bugs = run.payload.bugs
  const logs = run.payload.logs ?? []
  const steps = receiptSteps(walk?.steps ?? [], run.verdict)
  const setup = run.payload.setup
  const tone = run.verdict ?? run.status

  return (
    <main id="content" className="page wide">
      <p className="crumb">
        <a href="/">First User</a>
        <span aria-hidden="true">/</span>
        <span className="source">{run.source}</span>
      </p>
      <div className="hero-verdict">
        <span className={`pill ${tone}`}>{tone}</span>
      </div>
      <h1>{summary(run)}</h1>
      {bugs ? (
        <div className="stats">
          <div className="stat">
            <b>{bugs.pageErrors}</b>
            <span>page errors</span>
          </div>
          <div className="stat">
            <b>{bugs.action5xx}</b>
            <span>5xx responses</span>
          </div>
          <div className="stat">
            <b>{bugs.deadPrimary}</b>
            <span>dead controls</span>
          </div>
        </div>
      ) : null}
      <div className="meta-row">
        {walk?.replayUrl ? (
          <a href={walk.replayUrl} rel="noreferrer">
            Open Solari replay
          </a>
        ) : (
          <span>Screenshots are the durable tape. Replay was not ready in time.</span>
        )}
        {setup?.startCommand ? (
          <span>
            Booted with {setup.startCommand}
            {setup.port ? ` · port ${setup.port}` : ""}
          </span>
        ) : null}
      </div>
      <h2 className="section-title">What it tried</h2>
      {steps.length === 0 ? (
        <p className="lede">Waiting for the first user…</p>
      ) : (
        <ol className="timeline">
          {steps.map((s, i) => (
            <li key={i}>
              <div className="step-head">
                <span className="step-index">{String(i + 1).padStart(2, "0")}</span>
                <div className="step-copy">
                  <strong>{s.action}</strong>
                  <p>{s.note}</p>
                </div>
              </div>
              {s.screenshotJpeg ? (
                <div className="browser">
                  <div className="browser-bar" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </div>
                  <img
                    className="shot"
                    alt={s.note}
                    width={1280}
                    height={720}
                    loading={i === 0 ? "eager" : "lazy"}
                    src={`data:image/jpeg;base64,${s.screenshotJpeg}`}
                  />
                </div>
              ) : null}
            </li>
          ))}
        </ol>
      )}
      {logs.length > 0 ? (
        <details className="log-box">
          <summary>Setup log</summary>
          <pre className="logs">{logs.join("\n")}</pre>
        </details>
      ) : null}
    </main>
  )
}
