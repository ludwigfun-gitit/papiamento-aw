/**
 * The Aruban spelling authority: the 2009 *Vocabulario di Papiamento*
 * (`aw-lexicon.txt`, extracted from the PDF in `docs/lexicon/`) plus
 * `exceptions.txt` (explicit mappings and additions). Loaded once per
 * process from the package's own `data/` directory, found relative to this
 * module, so it works from `src/` (tests) and `dist/` (consumers) alike.
 * `PAPIAMENTO_LEXICON_DIR` overrides the directory.
 */
export type Lexicon = {
    words: Set<string>;
    phrases: Set<string>;
    /** explicit `from -> to` mappings, lower-cased */
    map: Map<string, string>;
};
export type SiteLexicon = {
    map: Map<string, string>;
    words: Set<string>;
};
export declare function setSiteLexicon(site: SiteLexicon): void;
export declare function loadLexicon(): Lexicon;
/** Tests and scripts that edit the files. */
export declare function resetLexicon(): void;
