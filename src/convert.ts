import { loadLexicon, type Lexicon } from './lexicon.js'

/**
 * Papiamento spelling conversion.
 *
 * `toAruban()` makes a text conform to the official Aruban spelling. The rule
 * is "rules propose, lexicon disposes": a word already in the 2009 list (or
 * the exceptions) is kept; otherwise the Curaçao→Aruba conventions generate
 * candidates and the first one the list contains wins. A word with no
 * attested candidate is left exactly as written and reported as unknown, so
 * the converter never emits a spelling the authority does not know.
 *
 * `toCuracao()` goes the other way with rules alone: the phonemic spelling
 * follows sound, so it is far more regular, but there is no Curaçao list to
 * check against, and it is used only to render stored Aruban text for a
 * `pap-cw` reader.
 *
 * Pure: no Payload, no I/O beyond the lexicon files loaded once.
 */

export type ConversionResult = {
  text: string
  /** Distinct words left untouched because nothing attested them, lower-cased, in order of first appearance. */
  unknown: string[]
  changed: number
  total: number
}

const WORD = /[\p{L}\p{M}][\p{L}\p{M}'’]*/gu
const ENYE = ''

function stripAccents(s: string): string {
  // Keep ñ: it is a letter of the Aruban alphabet, not an accent.
  return s
    .replace(/ñ/g, ENYE)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(new RegExp(ENYE, 'g'), 'ñ')
}

/**
 * Curaçao → Aruba candidate rules, applied in combinations. Each is a global
 * replacement; the lexicon decides which combination, if any, is right.
 */
type Rule = { re: RegExp; to: string; /** also try each single occurrence, not only all at once */ each?: boolean }

const RULES: Rule[] = [
  { re: /kshon/g, to: 'ccion' },
  { re: /shon/g, to: 'cion' },
  { re: /shon/g, to: 'sion' },
  { re: /sh/g, to: 'ci' },
  { re: /sh/g, to: 'cci' },
  { re: /sh/g, to: 'c' },
  { re: /sh/g, to: 's' },
  { re: /ks/g, to: 'x' },
  { re: /ks/g, to: 'c' },
  { re: /k(?=[ei])/g, to: 'qu' },
  { re: /k/g, to: 'c' },
  { re: /k/g, to: 'ch', each: true },
  { re: /z/g, to: 's' },
  { re: /s/g, to: 'z', each: true },
  { re: /s(?=[ei])/g, to: 'c', each: true },
  { re: /t$/g, to: 'd' },
  { re: /u$/g, to: 'o' },
  { re: /i$/g, to: 'y' },
  { re: /ei/g, to: 'ey' },
  { re: /ai/g, to: 'ay' },
  { re: /ou/g, to: 'ao' },
  { re: /ou/g, to: 'au' },
  { re: /w/g, to: 'hu' },
  { re: /y/g, to: 'i' },
]

/** Every way of applying one rule: all occurrences at once and, when flagged, each occurrence alone. */
function applyRule(word: string, rule: Rule): string[] {
  const all = word.replace(rule.re, rule.to)
  const out = new Set<string>()
  if (all !== word) out.add(all)
  if (rule.each) {
    const matches = [...word.matchAll(rule.re)]
    if (matches.length > 1) {
      for (const m of matches) {
        const i = m.index ?? 0
        // The match already satisfied any lookahead; substitute directly.
        out.add(word.slice(0, i) + rule.to + word.slice(i + m[0].length))
      }
    }
  }
  return [...out]
}

/** Bounded set of candidate spellings for one lower-cased, accent-free word: up to three rules. */
function candidates(base: string): string[] {
  const out = new Set<string>()
  const n = RULES.length
  for (let i = 0; i < n; i++) {
    for (const a of applyRule(base, RULES[i])) {
      out.add(a)
      for (let j = i + 1; j < n; j++) {
        for (const b of applyRule(a, RULES[j])) {
          out.add(b)
          for (let k = j + 1; k < n; k++) {
            for (const c of applyRule(b, RULES[k])) out.add(c)
          }
        }
      }
    }
  }
  out.delete(base)
  return [...out]
}

/** Suffixes the list does not carry: the plural and the object clitics. */
const SUFFIXES = ['nan', 'lo', 'le', 'nos', 'bo', 'mi', 'e']

/**
 * A final stressed vowel in Curaçao spelling often stands for a dropped
 * consonant that Aruban keeps: koló → color, muhé → muher, pastó → pastor.
 * Tried before the plain accent strip, which would otherwise land on a
 * shorter word that happens to exist (kolo).
 */
const STRESSED_FINAL: [RegExp, string][] = [
  [/ó$/, 'or'],
  [/é$/, 'er'],
  [/á$/, 'ar'],
]

function lookup(lower: string, lex: Lexicon): string | null {
  const mapped = lex.map.get(lower)
  if (mapped) return mapped
  if (lex.words.has(lower)) return lower
  for (const [re, to] of STRESSED_FINAL) {
    if (re.test(lower)) {
      const base = stripAccents(lower.replace(re, to))
      if (lex.words.has(base)) return base
      for (const cand of candidates(base)) if (lex.words.has(cand)) return cand
    }
  }
  const base = stripAccents(lower)
  if (base !== lower && lex.words.has(base)) return base
  for (const cand of candidates(base)) {
    if (lex.words.has(cand)) return cand
  }
  return null
}

/** Prefixes the list attaches to some stems but not others. */
const PREFIXES = ['des', 're', 'in']

function resolveWord(lower: string, lex: Lexicon): string | null {
  const direct = lookup(lower, lex)
  if (direct) return direct
  // Plural / clitic: strip, resolve the stem, reattach.
  for (const suf of SUFFIXES) {
    if (lower.length > suf.length + 2 && lower.endsWith(suf)) {
      const stem = lookup(lower.slice(0, -suf.length), lex)
      if (stem) return stem + suf
    }
  }
  for (const pre of PREFIXES) {
    if (lower.length > pre.length + 3 && lower.startsWith(pre)) {
      const rest = lookup(lower.slice(pre.length), lex)
      if (rest) return pre + rest
    }
  }
  return null
}

function matchCase(original: string, converted: string): string {
  if (original === original.toUpperCase() && original.length > 1) return converted.toUpperCase()
  if (original[0] === original[0].toUpperCase()) return converted[0].toUpperCase() + converted.slice(1)
  return converted
}

function isSentenceStart(text: string, index: number): boolean {
  const before = text.slice(0, index).replace(/[\s"'“”«»(\[]+$/, '')
  return before.length === 0 || /[.!?:\n]$/.test(before)
}

export function toAruban(text: string): ConversionResult {
  const lex = loadLexicon()
  const unknown: string[] = []
  const seen = new Set<string>()
  let changed = 0
  let total = 0

  const out = text.replace(WORD, (word: string, offset: number) => {
    // Single letters are not looked up — except the conjunction: Curaçao
    // writes "i" for "and", Aruba writes "y".
    if (word.length < 2) {
      if (word === 'i') {
        changed += 1
        return 'y'
      }
      if (word === 'I' && !isSentenceStart(text, offset)) {
        changed += 1
        return 'Y'
      }
      return word
    }
    total += 1
    const lower = word.toLowerCase().replace(/’/g, "'")
    const resolved = resolveWord(lower, lex)
    if (resolved) {
      if (resolved !== lower) changed += 1
      return matchCase(word, resolved)
    }
    // Proper nouns pass through silently; everything else is reported.
    const capitalised = word[0] !== word[0].toLowerCase() && !isSentenceStart(text, offset)
    if (!capitalised && !seen.has(lower)) {
      seen.add(lower)
      unknown.push(lower)
    }
    return word
  })
  return { text: out, unknown, changed, total }
}

/**
 * Aruban → Curaçao rendering, rules only. Regular because the phonemic
 * spelling follows sound; imperfect because Aruban etymological spelling
 * does not always say how a word sounds (a final -o may be /u/).
 */
const CH = ''
const CW_RULES: [RegExp, string][] = [
  [/ccion/g, 'kshon'],
  [/cion/g, 'shon'],
  [/sion/g, 'shon'],
  [/qu(?=[ei])/g, 'k'],
  [/ch/g, CH],
  [/c(?=[ei])/g, 's'],
  [/c/g, 'k'],
  [new RegExp(CH, 'g'), 'ch'],
  [/z/g, 's'],
  [/ay$/g, 'ai'],
  [/ey$/g, 'ei'],
  [/^y$/g, 'i'],
  [/ao$/g, 'ou'],
  [/dad$/g, 'dat'],
  [/hu(?=[aeio])/g, 'w'],
]

export function toCuracao(text: string): string {
  return text.replace(WORD, (word: string) => {
    const lower = word.toLowerCase()
    // Rules look at word ends, so take the plural off first and put it back.
    const plural = lower.length > 5 && lower.endsWith('nan')
    let w = plural ? lower.slice(0, -3) : lower
    for (const [re, rep] of CW_RULES) w = w.replace(re, rep)
    if (plural) w += 'nan'
    return w === lower ? word : matchCase(word, w)
  })
}
