export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell">
      <a className="skip" href="#content">
        Skip to content
      </a>
      <header className="topbar">
        <a className="mark" href="/">
          First User
        </a>
        <nav className="topnav" aria-label="Primary">
          <a href="https://getsolari.com" rel="noreferrer">
            Solari homepage
          </a>
          <a href="https://docs.getsolari.com" rel="noreferrer">
            Solari docs
          </a>
        </nav>
      </header>
      {children}
      <footer className="foot">
        <p>
          Untrusted code runs in a Solari microVM. Screenshots stay on this
          receipt after the preview token expires.
        </p>
      </footer>
    </div>
  )
}
