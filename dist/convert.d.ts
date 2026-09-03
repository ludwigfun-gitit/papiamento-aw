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
    text: string;
    /** Distinct words left untouched because nothing attested them, lower-cased, in order of first appearance. */
    unknown: string[];
    changed: number;
    total: number;
};
export declare function toAruban(text: string): ConversionResult;
export declare function toCuracao(text: string): string;
