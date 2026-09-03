/**
 * @bloo/papiamento-aw — the Aruban Papiamento spelling converter.
 *
 * `toAruban(text)` turns Curaçao-spelled (or mixed) Papiamento into the
 * official 2009 Aruban spelling and reports the words it could not attest;
 * `toCuracao(text)` renders Aruban text in Curaçao spelling, rules only.
 * `setSiteLexicon` lets a host add words and mappings at runtime (misa.aw's
 * admin corrections). The Google Translate adapter is a separate entry:
 * `@bloo/papiamento-aw/google`.
 */
export { toAruban, toCuracao } from './convert.js';
export { loadLexicon, resetLexicon, setSiteLexicon } from './lexicon.js';
