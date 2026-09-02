import { listSeededRuns } from "@/src/lib/db"

export const runtime = "nodejs"

export async function GET() {
  const rows = listSeededRuns()
  const pass = rows.find((r) => r.verdict === "PASS")
  const fail = rows.find((r) => r.verdict === "FAIL")
  return Response.json({
    passId: pass?.id ?? null,
    failId: fail?.id ?? null,
  })
}
