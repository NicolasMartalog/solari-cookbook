import { HomeForm } from "./home-form"
import { HeroWalk } from "./hero-walk"
import { listSeededRuns } from "@/src/lib/db"
import { stepShots } from "@/src/lib/display"

export const dynamic = "force-dynamic"

function IconPaste() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <rect x="5" y="7" width="14" height="14" rx="2" />
    </svg>
  )
}

function IconBoot() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M8 9h8M8 12h5M8 15h6" />
    </svg>
  )
}

function IconWatch() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <path d="M10 9.5v5l4.5-2.5L10 9.5Z" fill="currentColor" stroke="none" />
    </svg>
  )
}

export default function HomePage() {
  const rows = listSeededRuns()
  const pass = rows.find((r) => r.verdict === "PASS")
  const fail = rows.find((r) => r.verdict === "FAIL")
  const passShots = pass ? stepShots(pass.payload) : []
  const failShots = fail ? stepShots(fail.payload) : []

  const marquee = [
    "Paste a repo",
    "Boot a microVM",
    "Open a cloud browser",
    "Click the first control",
    "Stamp PASS or FAIL",
    "Share the receipt",
  ]

  return (
    <main id="content" className="page home">
      <div className="hero">
        <div className="hero-copy">
          <p className="eyebrow">
            <span className="dot" aria-hidden="true" />
            Built on Solari
          </p>
          <h1>A stranger uses your app. You get the tape.</h1>
          <p className="lede">
            Paste a public GitHub repo or a live URL. A sandbox boots it, a cloud
            browser is the first user, and the receipt is screenshots you can share.
          </p>
          <HomeForm passId={pass?.id} failId={fail?.id} />
        </div>
        <HeroWalk />
      </div>

      <div className="marquee" aria-hidden="true">
        <div className="marquee-track">
          {[0, 1].map((copy) => (
            <p key={copy}>
              {marquee.map((item) => (
                <span key={`${copy}-${item}`}>{item}</span>
              ))}
            </p>
          ))}
        </div>
      </div>

      <section className="bento" aria-label="How it works">
        <article className="step-card">
          <div className="step-icon">
            <IconPaste />
          </div>
          <p className="step-n">01</p>
          <h2>Paste</h2>
          <p>A public repo or an already-deployed URL. Private hosts are rejected.</p>
        </article>
        <article className="step-card">
          <div className="step-icon">
            <IconBoot />
          </div>
          <p className="step-n">02</p>
          <h2>Boot</h2>
          <p>Solari clones and starts it in a microVM. Nothing untrusted runs here.</p>
        </article>
        <article className="step-card">
          <div className="step-icon">
            <IconWatch />
          </div>
          <p className="step-n">03</p>
          <h2>Watch</h2>
          <p>A recorded browser clicks the first real control. You keep the tape.</p>
        </article>
      </section>

      {(pass || fail) && (
        <section className="proof">
          <h2 className="section-title">Finished runs</h2>
          <div className="proof-grid">
            {pass ? (
              <a className="proof-card" href={`/r/${pass.id}`}>
                {passShots[0] ? (
                  <div className="proof-thumb">
                    <img
                      alt=""
                      src={`data:image/jpeg;base64,${passShots[0]}`}
                    />
                  </div>
                ) : null}
                <div className="proof-body">
                  <p className="proof-kicker tone-pass">PASS</p>
                  <h3>Working fixture</h3>
                  <p>The first control did something. Open the pass receipt.</p>
                </div>
              </a>
            ) : null}
            {fail ? (
              <a className="proof-card" href={`/r/${fail.id}`}>
                {failShots[0] ? (
                  <div className="proof-thumb">
                    <img
                      alt=""
                      src={`data:image/jpeg;base64,${failShots[0]}`}
                    />
                  </div>
                ) : null}
                <div className="proof-body">
                  <p className="proof-kicker tone-fail">FAIL</p>
                  <h3>Broken button</h3>
                  <p>The primary control did nothing. Same walker, opposite result.</p>
                </div>
              </a>
            ) : null}
          </div>
        </section>
      )}
    </main>
  )
}
