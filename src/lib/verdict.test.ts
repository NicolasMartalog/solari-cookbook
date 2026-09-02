import assert from "node:assert/strict"
import { test } from "node:test"
import { decideVerdict } from "./verdict.ts"
import type { VerdictFacts } from "./verdict.ts"

const passFacts: VerdictFacts = {
  loaded200: true,
  nonempty: true,
  realInteraction: true,
  pageErrors: 0,
  action5xx: 0,
  deadPrimary: 0,
  bootFailed: false,
  loginWall: false,
}

test("PASS when all gates hold", () => {
  assert.equal(decideVerdict(passFacts), "PASS")
})

test("FAIL on dead primary", () => {
  assert.equal(decideVerdict({ ...passFacts, deadPrimary: 1 }), "FAIL")
})

test("FAIL on pageerror", () => {
  assert.equal(decideVerdict({ ...passFacts, pageErrors: 1 }), "FAIL")
})

test("FAIL on action 5xx", () => {
  assert.equal(decideVerdict({ ...passFacts, action5xx: 1 }), "FAIL")
})

test("INCONCLUSIVE on login wall", () => {
  assert.equal(decideVerdict({ ...passFacts, loginWall: true }), "INCONCLUSIVE")
})

test("INCONCLUSIVE on boot failure", () => {
  assert.equal(
    decideVerdict({ ...passFacts, bootFailed: true, realInteraction: false }),
    "INCONCLUSIVE",
  )
})

test("INCONCLUSIVE without interaction", () => {
  assert.equal(decideVerdict({ ...passFacts, realInteraction: false }), "INCONCLUSIVE")
})
