# Security

## Reporting a vulnerability

Please do not open a public issue. Use [GitHub's private vulnerability reporting](https://github.com/whosdrix/glowup/security/advisories/new) instead, and you will get a reply within a few days.

## What the scripts do

- `capture` and `audit` open the URL you give them in a headless browser on your machine, the same way you would in a normal browser. They run the page's own JavaScript. Only point them at sites you would open yourself.
- Images the page loads are saved to `glowup/<domain>/capture/assets/` so the rebuilt site can reuse them.
- `verify` serves the built site on `127.0.0.1` on a random port while it runs, then stops the server.
- On first run the CLI installs `playwright-core` and `axe-core` from npm into `~/.cache/glowup`. Set `GLOWUP_CACHE` to use another folder, or `CHROMIUM_PATH` to use a browser you already have.

Nothing is uploaded anywhere. There are no API keys and no telemetry.
