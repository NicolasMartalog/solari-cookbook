# First User

**Paste a public GitHub repo or a live URL. A [Solari](https://getsolari.com) sandbox boots it, a recorded cloud browser is the first user, and you get a shareable PASS / FAIL / INCONCLUSIVE receipt.**

[Live app](#) · [PASS receipt](https://github.com/NicolasMartalog/solari-cookbook) · [FAIL receipt](https://github.com/NicolasMartalog/solari-cookbook)

Fork of [solari-sdk/solari-cookbook](https://github.com/solari-sdk/solari-cookbook) for the [Pinetree Research intern](https://x.com/harrychow_/status/2094437473912844480) challenge. Cookbook programs stay in `examples/`.

## Try it

Open the live app, or these finished runs (no credits):

- **PASS** — working fixture, first control did something: `/r/12d6ba07-1f3e-4332-92b5-b382116a640f`
- **FAIL** — broken button, first control did nothing: `/r/b25bb6a0-5bcc-4c51-83ac-cce5412bbfaa`

Public GitHub fixtures you can paste (uses a sandbox):

- PASS: `https://github.com/NicolasMartalog/first-user-ok-app`
- FAIL: `https://github.com/NicolasMartalog/first-user-dead-button`

## Loop

1. **Paste** a `github.com/owner/repo` or a public `http(s)` URL. Private and localhost hosts are rejected.
2. **Boot** — Solari clones the repo in a microVM, installs, starts it, and exposes `previewUrl`. Untrusted code never runs on the Next.js server.
3. **Watch** — a recorded Solari browser opens the preview, screenshots, and clicks the first real control.
4. **Receipt** — `/r/:id` keeps our screenshots after the preview token expires. Verdict is locked: **PASS** only if it loaded, had content, a control did something, and there were no uncaught page errors / 5xx / dead primary buttons.

## Run locally

```bash
cp .env.example .env   # SOLARI_API_KEY from console.getsolari.com
npm install
npm test
npm run dev
```

`SOLARI_API_KEY` stays in `.env` / Vercel env. It is never committed.

Starter limits: 2 sandboxes, ~20 browsers. This app holds **one** sandbox at a time and does not retry `429 ConcurrencyLimitExceeded`. Always `sandbox.kill()` and `solari.close()`.

Do not loop `npm run seed` or `npm run gate0`.

## Cookbook examples

Unchanged from upstream. See the [Solari cookbook README](https://github.com/solari-sdk/solari-cookbook).
