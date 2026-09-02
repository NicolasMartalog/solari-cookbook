export type Verdict = "PASS" | "FAIL" | "INCONCLUSIVE"

export type VerdictFacts = {
  loaded200: boolean
  nonempty: boolean
  realInteraction: boolean
  pageErrors: number
  action5xx: number
  deadPrimary: number
  bootFailed: boolean
  loginWall: boolean
}

export function decideVerdict(facts: VerdictFacts): Verdict {
  if (facts.bootFailed || facts.loginWall) return "INCONCLUSIVE"
  if (facts.pageErrors > 0 || facts.action5xx > 0 || facts.deadPrimary > 0) {
    return "FAIL"
  }
  if (
    facts.loaded200 &&
    facts.nonempty &&
    facts.realInteraction &&
    facts.pageErrors === 0 &&
    facts.action5xx === 0 &&
    facts.deadPrimary === 0
  ) {
    return "PASS"
  }
  return "INCONCLUSIVE"
}
