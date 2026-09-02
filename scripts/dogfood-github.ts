import { createRun, getRun, updateRun } from "../src/lib/db"
import { loadDotenv } from "../src/lib/env"
import { parseSource } from "../src/lib/parse-source"
import { runJob } from "../src/lib/run-job"

loadDotenv()

const cases = [
  {
    source: "https://github.com/mdn/beginner-html-site-scripted",
    expect: "PASS",
  },
  {
    source: "https://github.com/NicolasMartalog/first-user-ok-app",
    expect: "PASS",
  },
  {
    source: "https://github.com/NicolasMartalog/first-user-dead-button",
    expect: "FAIL",
  },
] as const

function isConcurrency(message?: string) {
  return Boolean(message && /429|ConcurrencyLimitExceeded/i.test(message))
}

async function main() {
  const filter = process.argv[2]
  const selected = filter ? cases.filter((spec) => spec.source.includes(filter)) : cases
  if (selected.length === 0) {
    throw new Error(`no dogfood case matches ${filter}`)
  }
  for (const spec of selected) {
    const parsed = parseSource(spec.source)
    if (parsed.kind !== "github") {
      throw new Error(`${spec.source} is not a github URL`)
    }
    const run = await createRun({ kind: "github", source: spec.source })
    await updateRun(run.id, {
      payload: { cloneUrl: parsed.cloneUrl, branch: parsed.branch, logs: [] },
    })
    console.log(`start ${run.id} ${spec.source} (want ${spec.expect})`)
    await runJob(run.id)
    const done = await getRun(run.id)
    const logs = Array.isArray(done?.payload.logs) ? (done.payload.logs as string[]) : []
    console.log(
      `done ${run.id} verdict=${done?.verdict ?? "none"} want=${spec.expect} message=${done?.message ?? ""}`,
    )
    for (const line of logs.slice(-12)) console.log("  ", line)
    if (isConcurrency(done?.message) || logs.some((l) => isConcurrency(l))) {
      console.error("ConcurrencyLimitExceeded — stopping. Do not retry.")
      process.exitCode = 1
      return
    }
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
