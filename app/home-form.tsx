"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export function HomeForm({
  passId,
  failId,
}: {
  passId?: string
  failId?: string
}) {
  const router = useRouter()
  const [source, setSource] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function start(nextSource: string) {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ source: nextSource }),
      })
      const body = (await res.json()) as { id?: string; error?: string }
      if (!res.ok || !body.id) {
        setError(body.error ?? "Unable to start a run. Check the URL and try again.")
        setBusy(false)
        return
      }
      router.push(`/r/${body.id}`)
    } catch {
      setError("Unable to reach First User. Check your connection and try again.")
      setBusy(false)
    }
  }

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void start(source)
        }}
        noValidate
      >
        <label className="label" htmlFor="source">
          Public GitHub repo or live URL
        </label>
        <div className="command">
          <input
            id="source"
            type="text"
            name="source"
            inputMode="url"
            autoComplete="url"
            placeholder="https://github.com/owner/repo"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            required
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "source-error" : undefined}
          />
          <button className="btn btn-primary" type="submit" disabled={busy} aria-busy={busy}>
            {busy ? <span className="spin" aria-hidden="true" /> : null}
            Be the first user
          </button>
        </div>
      </form>
      {error ? (
        <p className="error" role="alert" id="source-error">
          {error}
        </p>
      ) : null}
      <div className="chips">
        {passId ? (
          <a className="chip" href={`/r/${passId}`}>
            Open a pass receipt
          </a>
        ) : null}
        {failId ? (
          <a className="chip" href={`/r/${failId}`}>
            Open a fail receipt
          </a>
        ) : null}
        <button
          type="button"
          className="chip"
          disabled={busy}
          onClick={() => setSource("https://github.com/NicolasMartalog/first-user-ok-app")}
        >
          Example PASS repo
        </button>
        <button
          type="button"
          className="chip"
          disabled={busy}
          onClick={() => setSource("https://github.com/NicolasMartalog/first-user-dead-button")}
        >
          Example FAIL repo
        </button>
        <button
          type="button"
          className="chip"
          disabled={busy}
          onClick={() => void start("fixture:ok-app")}
        >
          Run a fixture
        </button>
      </div>
    </div>
  )
}
