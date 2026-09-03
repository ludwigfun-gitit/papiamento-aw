#!/usr/bin/env node
// Pull the admin's converter decisions from misa.aw into data/exceptions.txt.
//
//   MISA_SECRET=… pnpm import-corrections
//   MISA_URL=http://localhost:3000 MISA_SECRET=… pnpm import-corrections   (a dev server)
//
// misa.aw serves them at /api/admin/papiamento/corrections in this file's own
// format: `from -> to` for a corrected word, `+ word` for a word accepted as
// Aruban. The merge is idempotent: a line already present is skipped; a
// mapping whose `from` already exists with a different `to` is replaced (the
// admin's latest decision wins); everything new lands under a dated header.
// Then: pnpm test, pnpm build, commit, tag, push, and bump the tag in the
// consumers. Nothing here touches the lexicon itself.
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const FILE = fileURLToPath(new URL('../data/exceptions.txt', import.meta.url))
const base = (process.env.MISA_URL || 'https://misa-aw-production.up.railway.app').replace(/\/$/, '')
const secret = process.env.MISA_SECRET
if (!secret) {
  console.error('MISA_SECRET is required: the value of CRON_SECRET (or SEED_SECRET) on the misa.aw server.')
  process.exit(2)
}

const resp = await fetch(`${base}/api/admin/papiamento/corrections`, {
  headers: { 'x-cron-secret': secret, 'x-seed-secret': secret },
  signal: AbortSignal.timeout(30000),
})
if (!resp.ok) {
  console.error(`misa.aw answered ${resp.status}: ${(await resp.text()).slice(0, 200)}`)
  process.exit(1)
}
const incoming = (await resp.text())
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith('#'))

const lines = readFileSync(FILE, 'utf8').split('\n')
const parse = (line) => {
  const body = line.replace(/#.*$/, '').trim()
  if (!body) return null
  if (body.startsWith('+')) return { kind: 'accept', word: body.slice(1).trim().toLowerCase() }
  const m = body.match(/^(.+?)\s*->\s*(.+)$/)
  return m ? { kind: 'map', from: m[1].trim().toLowerCase(), to: m[2].trim().toLowerCase() } : null
}

const mapIndex = new Map() // from -> line number
const accepted = new Set()
lines.forEach((l, i) => {
  const p = parse(l)
  if (!p) return
  if (p.kind === 'map') mapIndex.set(p.from, i)
  else accepted.add(p.word)
})

let added = 0
let replaced = 0
let skipped = 0
const fresh = []
for (const raw of incoming) {
  const p = parse(raw)
  if (!p) continue
  if (p.kind === 'accept') {
    if (accepted.has(p.word) || mapIndex.has(p.word)) skipped++
    else {
      fresh.push(`+ ${p.word}`)
      accepted.add(p.word)
      added++
    }
    continue
  }
  const at = mapIndex.get(p.from)
  if (at === undefined) {
    fresh.push(`${p.from} -> ${p.to}`)
    mapIndex.set(p.from, -1)
    added++
  } else if (at >= 0 && parse(lines[at]).to !== p.to) {
    lines[at] = `${p.from} -> ${p.to}`
    replaced++
  } else skipped++
}

if (fresh.length) {
  const stamp = new Date().toISOString().slice(0, 10)
  while (lines.length && lines[lines.length - 1].trim() === '') lines.pop()
  lines.push('', `# Imported from misa.aw admin ${stamp}`, ...fresh, '')
}
if (added || replaced) writeFileSync(FILE, lines.join('\n'))
console.log(`${incoming.length} from misa.aw: ${added} added, ${replaced} replaced, ${skipped} already present → ${added || replaced ? 'data/exceptions.txt updated' : 'nothing to do'}`)
