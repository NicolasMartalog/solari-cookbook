import assert from "node:assert/strict"
import { test } from "node:test"
import { parseSource } from "./parse-source.ts"

test("github repo", () => {
  const r = parseSource("https://github.com/vercel/next.js")
  assert.equal(r.kind, "github")
  if (r.kind === "github") {
    assert.equal(r.owner, "vercel")
    assert.equal(r.repo, "next.js")
    assert.equal(r.cloneUrl, "https://github.com/vercel/next.js.git")
  }
})

test("github with branch", () => {
  const r = parseSource("https://github.com/vercel/next.js/tree/canary")
  assert.equal(r.kind, "github")
  if (r.kind === "github") assert.equal(r.branch, "canary")
})

test("rejects localhost", () => {
  const r = parseSource("http://127.0.0.1:3000")
  assert.equal(r.kind, "reject")
})

test("rejects metadata IP", () => {
  const r = parseSource("http://169.254.169.254/")
  assert.equal(r.kind, "reject")
})

test("rejects private RFC1918", () => {
  const r = parseSource("http://10.0.0.5/app")
  assert.equal(r.kind, "reject")
})

test("rejects git ssh", () => {
  const r = parseSource("git@github.com:vercel/next.js.git")
  assert.equal(r.kind, "reject")
})

test("accepts https live url", () => {
  const r = parseSource("https://first-user.vercel.app")
  assert.equal(r.kind, "url")
  if (r.kind === "url") assert.equal(r.href, "https://first-user.vercel.app/")
})

test("accepts named fixtures", () => {
  const r = parseSource("fixture:ok-app")
  assert.equal(r.kind, "fixture")
  if (r.kind === "fixture") assert.equal(r.name, "ok-app")
})

test("rejects unknown fixtures", () => {
  const r = parseSource("fixture:nope")
  assert.equal(r.kind, "reject")
})

test("allows localhost when opted in", () => {
  const r = parseSource("http://127.0.0.1:3000/fixtures/ok-app/", {
    allowLocal: true,
  })
  assert.equal(r.kind, "url")
})
