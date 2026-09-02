import type { FixtureName } from "./parse-source"

const OK_APP = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Ok app</title>
  </head>
  <body>
    <h1>Ok app</h1>
    <p>A working control for First User PASS fixtures.</p>
    <button id="go" type="button">Go</button>
    <p id="out">idle</p>
    <script>
      document.getElementById("go").addEventListener("click", () => {
        document.getElementById("out").textContent = "clicked"
      })
    </script>
  </body>
</html>
`

const BROKEN_BUTTON = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Broken button</title>
  </head>
  <body>
    <h1>Broken button</h1>
    <p>This primary control does nothing. First User should FAIL.</p>
    <button id="go" type="button">Go</button>
    <p id="out">idle</p>
  </body>
</html>
`

const FIXTURE_HTML: Record<FixtureName, string> = {
  "ok-app": OK_APP,
  "broken-button": BROKEN_BUTTON,
}

export function fixtureHtml(name: FixtureName): string {
  return FIXTURE_HTML[name]
}
