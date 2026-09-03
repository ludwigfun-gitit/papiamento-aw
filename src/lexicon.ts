import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * The Aruban spelling authority: the 2009 *Vocabulario di Papiamento*
 * (`aw-lexicon.txt`, extracted from the PDF in `docs/lexicon/`) plus
 * `exceptions.txt` (explicit mappings and additions). Loaded once per
 * process from the package's own `data/` directory, found relative to this
 * module, so it works from `src/` (tests) and `dist/` (consumers) alike.
 * `PAPIAMENTO_LEXICON_DIR` overrides the directory.
 */

export type Lexicon = {
  words: Set<string>
  phrases: Set<string>
  /** explicit `from -> to` mappings, lower-cased */
  map: Map<string, string>
}

let cached: Lexicon | null = null

/**
 * The site's own lexicon, kept in /admin (`papiamento-lexicon`): words
 * accepted as Aruban and `from -> to` corrections. It sits on top of the
 * files and wins over them. Set by `loadCorrections()` in corrections.ts;
 * the cache is rebuilt on the next lookup so a removed or changed entry
 * does not linger.
 */
let siteMap = new Map<string, string>()
let siteWords = new Set<string>()

export type SiteLexicon = { map: Map<string, string>; words: Set<string> }

export function setSiteLexicon(site: SiteLexicon): void {
  siteMap = site.map
  siteWords = site.words
  cached = null
}

function dir(): string {
  return process.env.PAPIAMENTO_LEXICON_DIR || fileURLToPath(new URL('../data/', import.meta.url))
}

export function loadLexicon(): Lexicon {
  if (cached) return cached
  const words = new Set<string>()
  const phrases = new Set<string>()
  const map = new Map<string, string>()

  const lexPath = path.join(dir(), 'aw-lexicon.txt')
  for (const raw of fs.readFileSync(lexPath, 'utf8').split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const w = line.toLowerCase()
    if (w.includes(' ')) phrases.add(w)
    else words.add(w)
  }

  const excPath = path.join(dir(), 'exceptions.txt')
  if (fs.existsSync(excPath)) {
    for (const raw of fs.readFileSync(excPath, 'utf8').split('\n')) {
      const line = raw.replace(/#.*$/, '').trim()
      if (!line) continue
      if (line.startsWith('+')) {
        const w = line.slice(1).trim().toLowerCase()
        if (w.includes(' ')) phrases.add(w)
        else if (w) words.add(w)
        continue
      }
      const m = line.match(/^(.+?)\s*->\s*(.+)$/)
      if (m) {
        const from = m[1].trim().toLowerCase()
        const to = m[2].trim().toLowerCase()
        map.set(from, to)
        if (!to.includes(' ')) words.add(to)
      }
    }
  }
  for (const w of siteWords) words.add(w)
  for (const [from, to] of siteMap) {
    map.set(from, to)
    if (!to.includes(' ')) words.add(to)
  }
  cached = { words, phrases, map }
  return cached
}

/** Tests and scripts that edit the files. */
export function resetLexicon(): void {
  cached = null
}
