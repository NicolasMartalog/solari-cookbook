import { readFileSync } from "node:fs"

export function loadDotenv(path = ".env") {
  try {
    const text = readFileSync(path, "utf8")
    for (const line of text.split("\n")) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue
      const eq = trimmed.indexOf("=")
      if (eq < 1) continue
      const key = trimmed.slice(0, eq)
      const val = trimmed.slice(eq + 1).trim()
      if (!process.env[key]) process.env[key] = val
    }
  } catch {
    /* optional */
  }
}

export function requireSolariKey(): string {
  loadDotenv()
  const key = process.env.SOLARI_API_KEY
  if (!key) throw new Error("SOLARI_API_KEY missing")
  return key
}
