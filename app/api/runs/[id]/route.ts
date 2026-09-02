import { getRun } from "@/src/lib/db"

export const runtime = "nodejs"

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params
  const run = getRun(id)
  if (!run) return Response.json({ error: "not found" }, { status: 404 })
  return Response.json(run)
}
