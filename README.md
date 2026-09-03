# @bloo/papiamento-aw

The Aruban Papiamento spelling converter used by [misa.aw](https://misa.aw) and Traductor.

"Rules propose, lexicon disposes": a word already in the 2009 *Vocabulario di Papiamento* (`data/aw-lexicon.txt`, 16,193 entries) or in `data/exceptions.txt` is kept; otherwise the Curaçao→Aruba spelling conventions generate candidates and the lexicon decides which, if any, is right. Words it cannot attest are returned, never guessed.

```ts
import { toAruban, toCuracao } from '@bloo/papiamento-aw'

toAruban('Nos ta buska un kas ku un koló nobo.')
// { text: 'Nos ta busca un cas cu un color nobo.', unknown: [], changed: 4, total: 8 }

toCuracao('Nos ta busca un cas cu un color nobo.')
// 'Nos ta buska un kas ku un kolor nobo.'
```

```ts
import { googleTranslate } from '@bloo/papiamento-aw/google'
// Google Cloud Translation v2 with GOOGLE_TRANSLATE_API_KEY; target 'pap-aw' → Google 'pap', then run toAruban.
// googleDetect(text) → { language: 'pap' | 'nl' | …, confidence }
```

## Install (git dependency)

```sh
pnpm add github:ludwigfun-gitit/papiamento-aw#v0.3.1
```

`dist/` is committed, so no build step runs on install.

## Maintain

- Add a mapping (`from -> to`) or an accepted word (`+ word`) to `data/exceptions.txt`, by hand or by pulling the decisions made in misa.aw's admin (the unknown-word list):

  ```sh
  MISA_SECRET=<CRON_SECRET of the misa.aw server> pnpm import-corrections
  ```

  Idempotent: present lines are skipped, a changed correction replaces the old mapping, new lines land under a dated header.
- `pnpm test`, `pnpm build`, commit, tag `vX.Y.Z`, push. Consumers bump the tag.
