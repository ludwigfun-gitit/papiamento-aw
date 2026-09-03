# @bloo/papiamento-aw

The Aruban Papiamento spelling converter (2009 *Vocabulario di Papiamento*
+ exceptions) and the Google Translate adapter, as a package shared by
misa.aw and Traductor. Carved out of misa.aw on 2026-09-02.

Locate the `ideaverse-vault` repo (`~/Vaults/Ideaverse` locally, or attached
alongside in a cloud session) and read its `CLAUDE.md` for global
orientation.

- MC:L project: `proj_1ktvi8Ug`, code `TRA` (shared with the `traductor` repo)
- Backlog: GET http://localhost:5173/api/lifecycles/entries?project_id=proj_1ktvi8Ug
- Reports: `.cc-reports/reports/`; briefs: `.cc-reports/briefs/`
- Architectural rules: no. Design rules: no (no UI).
- "Rules propose, lexicon disposes": `data/aw-lexicon.txt` is the 2009 list,
  `data/exceptions.txt` the explicit mappings (`from -> to`) and additions
  (`+ word`). Admin corrections made in misa.aw are exported into
  `exceptions.txt` on each release.
- `dist/` is committed: consumers install from git
  (`github:ludwigfun-gitit/papiamento-aw#v0.x.y`), so run `pnpm build` before
  committing a release and tag it.
- Tests: `pnpm test` (node:test, type-stripping).
- Main only, no branches.
