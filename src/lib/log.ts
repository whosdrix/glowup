const color = process.stderr.isTTY && !process.env.NO_COLOR
const paint = (code: string, s: string) => (color ? `\x1b[${code}m${s}\x1b[0m` : s)

export const log = {
  step: (msg: string) => process.stderr.write(`${paint('36', '›')} ${msg}\n`),
  ok: (msg: string) => process.stderr.write(`${paint('32', '✓')} ${msg}\n`),
  warn: (msg: string) => process.stderr.write(`${paint('33', '!')} ${msg}\n`),
  fail: (msg: string) => process.stderr.write(`${paint('31', '✗')} ${msg}\n`),
  dim: (s: string) => paint('2', s),
  bold: (s: string) => paint('1', s),
}
