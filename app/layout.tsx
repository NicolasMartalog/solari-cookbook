import { Inter, JetBrains_Mono } from "next/font/google"
import type { Metadata } from "next"
import { SiteShell } from "./site-shell"
import "./globals.css"

const sans = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
})

const mono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: "First User",
  description: "Paste a repo. A Solari browser is the first user. You get the tape.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  )
}
