// Run: pnpm test
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { toAruban, toCuracao } from '../src/convert.ts'
import { setSiteLexicon } from '../src/lexicon.ts'

test('words already Aruban are kept, Curaçao spellings become the attested Aruban form', () => {
  const r = toAruban('Nos ta buska un kas ku un koló nobo pa e organisashon nashonal.')
  assert.equal(r.text, 'Nos ta busca un cas cu un color nobo pa e organisacion nacional.')
  assert.deepEqual(r.unknown, [])
})

test('accents, plurals, clitics and the settled weekday', () => {
  assert.equal(toAruban('Diaranzon nos a publiká e anunsionan.').text, 'Diaranson nos a publica e anuncionan.')
  assert.equal(toAruban('hòmber, kurason, tempu').text, 'homber, curason, tempo')
})

test('never emits a spelling the list does not know; unknown words are reported, names pass silently', () => {
  const r = toAruban('Awe Pedro a bisa kxqz na Maria.')
  assert.equal(r.text, 'Awe Pedro a bisa kxqz na Maria.')
  assert.deepEqual(r.unknown, ['kxqz'])
})

test('case and punctuation survive', () => {
  assert.equal(toAruban('KU BO TA BAI? Ku bo ta bai.').text, 'CU BO TA BAY? Cu bo ta bay.')
  assert.equal(toAruban('“Kontakto” — (nashonal)').text, '“Contacto” — (nacional)')
})

test('exceptions file mappings apply', () => {
  assert.equal(toAruban('nos ta hasi esaki huntu').text, 'nos ta haci esaki hunto')
  assert.equal(toAruban('e ta einan').text, 'e ta eynan')
})

test('the conjunction: Curaçao "i" becomes Aruban "y"', () => {
  assert.equal(toAruban('pan i biña, Pedro i Juan. I e ta bay.').text, 'pan y biña, Pedro y Juan. I e ta bay.')
})

test('the Curaçao rendering of Aruban text', () => {
  assert.equal(
    toCuracao('Nos ta busca un cas cu un color nobo pa e organisacion nacional.'),
    'Nos ta buska un kas ku un kolor nobo pa e organisashon nashonal.',
  )
  assert.equal(toCuracao('Bay chikito, quier, cielo, awe'), 'Bai chikito, kier, sielo, awe')
})

test('exceptions from the unknown-word log, and a host-supplied site lexicon', () => {
  assert.equal(
    toAruban('revicion, atversarionan, national, djadumingu, opservashon, eskohonan, djabièrnè, djaweps').text,
    'revision, adversarionan, nacional, diadomingo, observacion, escohonan, diabierna, diahuebs',
  )
  assert.deepEqual(toAruban('un blorpo, gloop').unknown, ['blorpo', 'gloop'])
  setSiteLexicon({ map: new Map([['blorpo', 'blorpe']]), words: new Set(['gloop']) })
  assert.equal(toAruban('Un blorpo, gloop.').text, 'Un blorpe, gloop.')
  assert.deepEqual(toAruban('un blorpo, gloopnan').unknown, [])
  setSiteLexicon({ map: new Map(), words: new Set() })
  assert.deepEqual(toAruban('un blorpo').unknown, ['blorpo'])
})
