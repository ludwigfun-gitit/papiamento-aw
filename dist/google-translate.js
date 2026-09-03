/**
 * Google Cloud Translation, v2 REST with an API key (no service account).
 * Papiamento is `pap` for both varieties; the converter makes the result
 * Aruban afterwards. Cost is estimated from characters at the published
 * rate so the monthly spend ceiling keeps working across providers.
 *
 * Returns null when not configured. Throws on an HTTP failure so the caller
 * can leave the row `pending` for the retry job — never fails open. A 400
 * naming the language pair is logged in words, because that is the one
 * failure a human has to act on (the account does not have `pap`).
 */
const ENDPOINT = 'https://translation.googleapis.com/language/translate/v2';
const USD_PER_MILLION_CHARS = 20;
const GOOGLE_CODE = {
    'pap-aw': 'pap',
    'pap-cw': 'pap',
    en: 'en',
    es: 'es',
    nl: 'nl',
};
export function googleTranslateConfigured() {
    return Boolean(process.env.GOOGLE_TRANSLATE_API_KEY);
}
export async function googleTranslate(input) {
    const key = process.env.GOOGLE_TRANSLATE_API_KEY;
    if (!key)
        return null;
    const source = GOOGLE_CODE[input.sourceLanguage];
    const target = GOOGLE_CODE[input.targetLanguage];
    if (source === target)
        return null;
    const parts = [];
    if (input.title)
        parts.push({ field: 'title', text: input.title });
    if (input.body)
        parts.push({ field: 'body', text: input.body });
    if (parts.length === 0)
        return null;
    const endpoint = process.env.GOOGLE_TRANSLATE_ENDPOINT || ENDPOINT;
    const url = `${endpoint}?key=${encodeURIComponent(key)}`;
    const resp = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ q: parts.map((p) => p.text), source, target, format: 'text' }),
        signal: AbortSignal.timeout(30000),
    });
    if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        if (resp.status === 400 && /language|target|source/i.test(text)) {
            console.error(`[google-translate] the API rejected the language pair ${source}→${target}: ${text.slice(0, 200)}. ` +
                `Papiamento (pap) must be available on this project; rows stay pending until it is.`);
        }
        throw new Error(`google translate http ${resp.status}`);
    }
    const json = await resp.json();
    const translations = json?.data?.translations ?? [];
    if (translations.length !== parts.length)
        throw new Error('google translate: unexpected response shape');
    const out = {
        costUsd: (parts.reduce((n, p) => n + p.text.length, 0) / 1_000_000) * USD_PER_MILLION_CHARS,
    };
    parts.forEach((p, i) => {
        const t = decodeEntities(String(translations[i]?.translatedText ?? ''));
        if (t)
            out[p.field] = t;
    });
    return out;
}
/** `format: 'text'` should give plain text, but Google has been known to entity-escape apostrophes. */
function decodeEntities(s) {
    return s
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');
}
