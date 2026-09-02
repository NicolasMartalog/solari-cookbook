export function HeroWalk() {
  return (
    <div className="walk" aria-hidden="true">
      <div className="walk-meta">
        <span className="walk-rec">
          <i />
          First user
        </span>
        <ol className="walk-phases">
          <li className="walk-phase p1">Boot</li>
          <li className="walk-phase p2">Click</li>
          <li className="walk-phase p3">Receipt</li>
        </ol>
      </div>

      <div className="walk-stage">
        <div className="walk-browser">
          <div className="walk-chrome">
            <span />
            <span />
            <span />
            <code>preview.solari.dev/ok-app</code>
          </div>
          <div className="walk-page">
            <h2>Ok app</h2>
            <p>A working control for First User.</p>
            <span className="walk-go">Go</span>
            <p className="walk-out">
              <span className="walk-idle">idle</span>
              <span className="walk-done">clicked</span>
            </p>
            <div className="walk-ripple" />
            <svg className="walk-cursor" viewBox="0 0 18 24" fill="none">
              <path
                d="M2 1.5 16 13.2l-6.1.3 3.4 8.1-2.6 1.1-3.5-8.2L2 17.8V1.5Z"
                fill="#fff"
                stroke="#09090b"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        <aside className="walk-ticket">
          <p className="walk-stamp">PASS</p>
          <p className="walk-ticket-copy">First control did something.</p>
          <p className="walk-ticket-meta">shareable receipt</p>
        </aside>
      </div>
    </div>
  )
}
