import assert from "node:assert/strict"
import { test } from "node:test"
import { receiptSteps, shortPageRef } from "./display.ts"

test("shortPageRef keeps path, drops query", () => {
  assert.equal(
    shortPageRef(
      "https://abc.preview.getsolari.com/ok-app/?pt_token=secret",
    ),
    "/ok-app",
  )
})

test("receiptSteps drops leftover clicks after a PASS", () => {
  const steps = [
    { action: "goto", note: "opened /ok-app (200)" },
    { action: "click", note: "clicked “Go” and the page changed" },
    { action: "click", note: "clicked “Go” — nothing happened" },
  ]
  const next = receiptSteps(steps, "PASS")
  assert.equal(next.length, 2)
  assert.equal(next[1].note.includes("changed"), true)
})
