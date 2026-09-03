/** The languages the misa.aw family speaks. Both Papiamento varieties map to Google's `pap`. */
export type Lang = 'pap-aw' | 'pap-cw' | 'en' | 'es' | 'nl';
export type GoogleTranslateInput = {
    sourceLanguage: Lang;
    targetLanguage: Lang;
    title?: string;
    body?: string;
};
export type GoogleTranslateOutput = {
    title?: string;
    body?: string;
    costUsd: number;
};
export declare function googleTranslateConfigured(): boolean;
export declare function googleTranslate(input: GoogleTranslateInput): Promise<GoogleTranslateOutput | null>;
export type GoogleDetectOutput = {
    /** Google's code: `pap`, `nl`, `en`, `es`, … or `und` when unsure. */
    language: string;
    confidence: number;
    /** Google meters detection like translation, by characters. */
    costUsd: number;
};
/**
 * Language detection, v2 `/detect`. Returns null when not configured.
 * Papiamento comes back as `pap` for either spelling; the caller decides
 * what that means (Traductor: the free convert path).
 */
export declare function googleDetect(text: string): Promise<GoogleDetectOutput | null>;
