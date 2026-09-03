// Run: node --experimental-strip-types --import ./scripts/ts-resolver.mjs --test scripts/google-translate.test.ts
//
// Exercises the Cloud Translation v2 adapter against a local stub: request
// shape (q array, source/target codes, format), response mapping, entity
// decoding, and the failure paths. No Google account involved.
import assert from 'node:assert/strict'
import http from 'node:http'
import { after, before, test } from 'node:test'

import { googleTranslate, googleTranslateConfigured } from '../src/google-translate.ts'

let server: http.Server
let lastRequest: { url: string; body: any } | null = null
let mode: 'ok' | 'bad-language' | 'server-error' = 'ok'

before(async () => {
  server = http.createServer((req, res) => {
    let raw = ''
    req.on('data', (c) => (raw += c))
    req.on('end', () => {
      lastRequest = { url: req.url ?? '', body: JSON.parse(raw) }
      if (mode === 'bad-language') {
        res.writeHead(400, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ error: { code: 400, message: 'Invalid Value: target language pap is not supported' } }))
        return
      }
      if (mode === 'server-error') {
        res.writeHead(503)
        res.end('unavailable')
        return
      }
      const q: string[] = lastRequest.body.q
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ data: { translations: q.map((t) => ({ translatedText: `[pap] ${t}&#39;s` })) } }))
    })
  })
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
  const port = (server.address() as any).port
  process.env.GOOGLE_TRANSLATE_API_KEY = 'stub-key'
  process.env.GOOGLE_TRANSLATE_ENDPOINT = `http://127.0.0.1:${port}/translate`
})

after(() => server.close())

test('configured when the key is present', () => {
  assert.equal(googleTranslateConfigured(), true)
})

test('sends q as an array with pap for either Papiamento variety, maps the fields back, decodes entities, prices by characters', async () => {
  mode = 'ok'
  const out = await googleTranslate({ sourceLanguage: 'es', targetLanguage: 'pap-aw', title: 'Título', body: 'Cuerpo del texto' })
  assert.ok(lastRequest)
  assert.ok(lastRequest.url.includes('key=stub-key'))
  assert.deepEqual(lastRequest.body, { q: ['Título', 'Cuerpo del texto'], source: 'es', target: 'pap', format: 'text' })
  assert.equal(out?.title, "[pap] Título's")
  assert.equal(out?.body, "[pap] Cuerpo del texto's")
  assert.ok(Math.abs((out?.costUsd ?? 0) - (('Título'.length + 'Cuerpo del texto'.length) / 1_000_000) * 20) < 1e-12)
})

test('body only, and a Curaçao target also maps to pap', async () => {
  mode = 'ok'
  const out = await googleTranslate({ sourceLanguage: 'pap-cw', targetLanguage: 'nl', body: 'Bon dia' })
  assert.deepEqual(lastRequest?.body, { q: ['Bon dia'], source: 'pap', target: 'nl', format: 'text' })
  assert.equal(out?.title, undefined)
  assert.equal(out?.body, "[pap] Bon dia's")
})

test('same language, or nothing to translate, is a no-op', async () => {
  assert.equal(await googleTranslate({ sourceLanguage: 'pap-aw', targetLanguage: 'pap-cw', body: 'x' }), null)
  assert.equal(await googleTranslate({ sourceLanguage: 'es', targetLanguage: 'en' }), null)
})

test('an unsupported language pair throws (the row stays pending), as does a server error', async () => {
  mode = 'bad-language'
  await assert.rejects(googleTranslate({ sourceLanguage: 'es', targetLanguage: 'pap-aw', body: 'x' }), /http 400/)
  mode = 'server-error'
  await assert.rejects(googleTranslate({ sourceLanguage: 'es', targetLanguage: 'pap-aw', body: 'x' }), /http 503/)
})

test('not configured → null', async () => {
  const saved = process.env.GOOGLE_TRANSLATE_API_KEY
  delete process.env.GOOGLE_TRANSLATE_API_KEY
  assert.equal(googleTranslateConfigured(), false)
  assert.equal(await googleTranslate({ sourceLanguage: 'es', targetLanguage: 'pap-aw', body: 'x' }), null)
  process.env.GOOGLE_TRANSLATE_API_KEY = saved
})
