import { existsSync } from 'node:fs'
import { parseArgs } from 'node:util'
import { audit } from './commands/audit.js'
import { capture } from './commands/capture.js'
import { compose } from './commands/compose.js'
import { status } from './commands/status.js'
import { verify } from './commands/verify.js'
import { launchBrowser } from './lib/browser.js'
import { log } from './lib/log.js'

const HELP = `glowup: capture, audit and verify website redesigns

Usage
  glowup capture <url>   screenshots, content, brand colours and fonts
  glowup audit <url>     score the site out of 100 and list what is wrong
  glowup verify <url>    audit the rebuilt site in site/dist against the original
  glowup compose <url>   render the before/after proof image again
  glowup status <url>    show which steps are done for a site
  glowup doctor          check that a browser can be found

Options
  --root <dir>    where site folders live (default ./glowup)
  --pages <n>     pages to capture and audit, home included (default 5)
  --dist <dir>    built site to verify (default <root>/<site>/site/dist)
  --min-score <n> score the rebuilt site must reach (default 90)
  -h, --help
`

async function main(): Promise<number> {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      root: { type: 'string', default: 'glowup' },
      pages: { type: 'string', default: '5' },
      dist: { type: 'string' },
      'min-score': { type: 'string', default: '90' },
      help: { type: 'boolean', short: 'h' },
    },
  })
  const [command, url] = positionals
  if (values.help || !command) {
    process.stdout.write(HELP)
    return 0
  }
  const pages = Math.max(1, Math.min(10, Number.parseInt(values.pages ?? '5', 10) || 5))
  const root = values.root ?? 'glowup'
  const needUrl = () => {
    if (!url) throw new Error(`"glowup ${command}" needs a URL`)
    return url
  }

  switch (command) {
    case 'capture':
      await capture({ url: needUrl(), root, pages })
      return 0
    case 'audit':
      await audit({ url: needUrl(), root, pages })
      return 0
    case 'verify': {
      const minScore = Number.parseInt(values['min-score'] ?? '90', 10)
      const result = await verify({
        url: needUrl(),
        root,
        dist: values.dist,
        budget: { minScore, maxLineLength: 80 },
      })
      return result.passed ? 0 : 1
    }
    case 'compose':
      await compose({ url: needUrl(), root })
      return 0
    case 'status':
      process.stdout.write(await status({ url: needUrl(), root }))
      return 0
    case 'doctor': {
      const { browser, label } = await launchBrowser()
      log.ok(`browser: ${label} ${browser.version()}`)
      await browser.close()
      log.ok(`node ${process.version}`)
      log.ok(
        existsSync(root)
          ? `workspace ${root} exists`
          : `workspace ${root} will be created on first capture`,
      )
      return 0
    }
    default:
      process.stdout.write(HELP)
      return 1
  }
}

main().then(
  (code) => process.exit(code),
  (err: unknown) => {
    log.fail(err instanceof Error ? err.message : String(err))
    process.exit(1)
  },
)
