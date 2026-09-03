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
