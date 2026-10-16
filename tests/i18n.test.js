import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadI18n } from '../server/knowledge.js';

const i18n = loadI18n();
const { fr, en, ar } = i18n.dictionaries;
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const script = readFileSync(new URL('../script.js', import.meta.url), 'utf8');

test('FR, EN and AR expose exactly the same keys', () => {
  const keys = (d) => Object.keys(d).sort();
  assert.deepEqual(keys(en), keys(fr), 'EN differs from FR');
  assert.deepEqual(keys(ar), keys(fr), 'AR differs from FR');
});

test('no translation is empty and {placeholders} match across languages', () => {
  const tokens = (s) => (s.match(/\{\w+\}/g) || []).sort().join();
  for (const [key, value] of Object.entries(fr)) {
    for (const [lang, dict] of Object.entries({ fr, en, ar })) {
      assert.ok(dict[key]?.trim(), `${lang}.${key} is empty`);
    }
    assert.equal(tokens(en[key]), tokens(value), `placeholders differ for ${key} (en)`);
    assert.equal(tokens(ar[key]), tokens(value), `placeholders differ for ${key} (ar)`);
  }
});

test('Arabic strings contain Arabic script (no untranslated copy), except proper nouns', () => {
  // Brand / proper-noun-only strings are legitimately identical in every language.
  const properNouns = new Set([
    'p1Title', 'contactLabelLinkedIn', 'contactLabelGithub', 'filterErp', 'chatCounter',
    'exp1Org', 'exp2Org', 'edu1Org', 'edu2Org', 'edu3Org'
  ]);
  for (const [key, value] of Object.entries(ar)) {
    if (properNouns.has(key)) continue;
    assert.match(value, /[؀-ۿ]/, `ar.${key} has no Arabic: ${value}`);
  }
});

test('every data-i18n key used in index.html exists in every dictionary', () => {
  const used = new Set();
  for (const m of html.matchAll(/data-i18n(?:-html)?="([^"]+)"/g)) used.add(m[1]);
  for (const m of html.matchAll(/data-i18n-attr="([^"]+)"/g)) {
    m[1].split(';').forEach((pair) => used.add(pair.split(':')[1]?.trim()));
  }
  assert.ok(used.size > 100, 'expected many keys');
  for (const key of used) {
    for (const lang of ['fr', 'en', 'ar']) assert.ok(key in i18n.dictionaries[lang], `missing ${lang}.${key}`);
  }
});

test('translation keys requested from script.js exist', () => {
  for (const m of script.matchAll(/\bt\('([A-Za-z0-9]+)'/g)) {
    assert.ok(m[1] in fr, `script.js uses unknown key ${m[1]}`);
  }
});

test('RTL applies to Arabic only', () => {
  // i18n.js is evaluated in a vm context, so compare as plain JSON rather than by realm-bound reference.
  assert.equal(JSON.stringify(i18n.rtl), '["ar"]');
  assert.equal(JSON.stringify(i18n.languages), '["fr","en","ar"]');
});
