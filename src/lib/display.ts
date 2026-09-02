export function shortPageRef(url: string): string {
  try {
    const u = new URL(url)
    const path = u.pathname.replace(/\/$/, "") || "/"
    if (path !== "/") return path
    return u.host
  } catch {
    return "the page"
  }
}

export function receiptSteps<T extends { action: string; note: string }>(
  steps: T[],
  verdict: string | null,
): T[] {
  if (verdict !== "PASS") return steps
  const success = steps.findIndex(
    (s) => s.action === "click" && /page changed/.test(s.note),
  )
  if (success >= 0) return steps.slice(0, success + 1)
  return steps
}

export function stepShots(payload: Record<string, unknown>): string[] {
  const walk = payload.walk as
    | { steps?: Array<{ screenshotJpeg?: string }> }
    | undefined
  return (walk?.steps ?? [])
    .map((s) => s.screenshotJpeg)
    .filter((s): s is string => Boolean(s))
}
