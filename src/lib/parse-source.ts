export const FIXTURE_NAMES = ["ok-app", "broken-button"] as const
export type FixtureName = (typeof FIXTURE_NAMES)[number]

export type ParsedSource =
  | {
      kind: "github"
      owner: string
      repo: string
      branch?: string
      cloneUrl: string
    }
  | { kind: "url"; href: string }
  | { kind: "fixture"; name: FixtureName }
  | { kind: "reject"; reason: string }

const PRIVATE_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"])

function isPrivateIpv4(host: string): boolean {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host)
  if (!m) return false
  const [a, b] = [Number(m[1]), Number(m[2])]
  if (a === 10) return true
  if (a === 127) return true
  if (a === 0) return true
  if (a === 169 && b === 254) return true
  if (a === 192 && b === 168) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  return false
}

export function parseSource(
  input: string,
  opts: { allowLocal?: boolean } = {},
): ParsedSource {
  const raw = input.trim()
  if (!raw) return { kind: "reject", reason: "empty" }
  if (raw.startsWith("git@") || raw.startsWith("ssh://")) {
    return { kind: "reject", reason: "ssh remotes are not allowed" }
  }
  if (raw.startsWith("fixture:")) {
    const name = raw.slice("fixture:".length)
    if ((FIXTURE_NAMES as readonly string[]).includes(name)) {
      return { kind: "fixture", name: name as FixtureName }
    }
    return { kind: "reject", reason: "unknown fixture" }
  }

  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return { kind: "reject", reason: "not a URL" }
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { kind: "reject", reason: "only http(s) is allowed" }
  }

  const host = url.hostname.toLowerCase()
  const local = PRIVATE_HOSTS.has(host) || isPrivateIpv4(host) || host.endsWith(".local")
  if (local && !opts.allowLocal) {
    return { kind: "reject", reason: "private or local hosts are not allowed" }
  }

  if (host === "github.com" || host === "www.github.com") {
    const parts = url.pathname.split("/").filter(Boolean)
    if (parts.length < 2) return { kind: "reject", reason: "not a github repo URL" }
    const owner = parts[0]
    const repo = parts[1].replace(/\.git$/, "")
    const branch = parts[2] === "tree" && parts[3] ? parts[3] : undefined
    return {
      kind: "github",
      owner,
      repo,
      branch,
      cloneUrl: `https://github.com/${owner}/${repo}.git`,
    }
  }

  return { kind: "url", href: url.href }
}
