import { hasRunningGithub } from "./db"

const liveHits = new Map<string, number[]>()
const repoHits = new Map<string, number[]>()

function prune(map: Map<string, number[]>, ip: string, windowMs: number) {
  const now = Date.now()
  const next = (map.get(ip) ?? []).filter((t) => now - t < windowMs)
  map.set(ip, next)
  return next
}

export function tryAcquireRepoLock(): boolean {
  return !hasRunningGithub()
}

export function rateLimitLive(ip: string): boolean {
  const hits = prune(liveHits, ip, 60 * 60 * 1000)
  if (hits.length >= 3) return false
  hits.push(Date.now())
  liveHits.set(ip, hits)
  return true
}

export function rateLimitRepo(ip: string): boolean {
  const hits = prune(repoHits, ip, 60 * 60 * 1000)
  if (hits.length >= 1) return false
  hits.push(Date.now())
  repoHits.set(ip, hits)
  return true
}
