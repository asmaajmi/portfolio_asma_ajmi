import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const html = read('index.html');
const css = read('styles.css');

test('project previews and the portrait carry no overlay labels or badges', () => {
  assert.ok(!/figcaption/.test(html), 'figcaption labels were removed from project images');
  assert.ok(!/p-chip|photo-tag/.test(html + css), 'screenshot/mockup chips and the portrait tag are gone');
});

test('every download / local link points to a file that exists', () => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const targets = new Set();
  for (const m of html.matchAll(/(?:href|src)="((?:assets)\/[^"]+)"/g)) targets.add(m[1]);
  assert.ok([...targets].some((t) => t.endsWith('.pdf')), 'CV link present');
  for (const t of targets) assert.ok(existsSync(root + t), `${t} is missing`);
});

test('both CV buttons are plain downloadable links', () => {
  const links = [...html.matchAll(/<a[^>]*href="assets\/CV-Asma-Ajmi\.pdf"[^>]*>/g)].map((m) => m[0]);
  assert.equal(links.length, 2);
  for (const link of links) assert.match(link, /\bdownload\b/);
});

test('the closed chat widget never intercepts clicks on page content', () => {
  const widget = css.match(/\.chatbot\{[^}]*\}/)?.[0] ?? '';
  assert.match(widget, /pointer-events:\s*none/, '.chatbot container must be click-through');
  assert.match(css, /\.chat-toggle,\s*\.chat-panel\.is-open\{\s*pointer-events:\s*auto/, 'toggle and open panel stay interactive');
});

test('scroll animations respect reduced motion', () => {
  const reduced = css.slice(css.indexOf('prefers-reduced-motion'));
  assert.match(reduced, /\.reveal[^{]*\{[^}]*opacity:\s*1/);
  assert.match(reduced, /animation:\s*none\s*!important/);
  assert.match(read('script.js'), /prefers-reduced-motion: reduce/);
});

test('content hidden until revealed is only hidden behind elements that really receive .is-in', () => {
  // Regression: `.tl-card:not(.is-in) .bullets li` hid the experience bullets forever because
  // the JS adds .is-in to .tl-item (the .reveal element), never to .tl-card.
  const hiders = new Set([...css.matchAll(/(\.[a-z][\w-]*):not\(\.is-in\)/g)].map((m) => m[1].slice(1)));
  assert.ok(hiders.size >= 3);
  for (const cls of hiders) {
    const revealed = new RegExp(`class="[^"]*\\b${cls}\\b[^"]*\\breveal\\b|class="[^"]*\\breveal\\b[^"]*\\b${cls}\\b`);
    assert.match(html, revealed, `.${cls}:not(.is-in) hides content but .${cls} is never a .reveal element`);
  }
});

test('content stays visible without JavaScript', () => {
  assert.match(html, /<noscript>\s*<style>[^<]*\.reveal[^<]*opacity:\s*1/);
});

test('project screenshots are shown whole: no zoom, no crop, no fixed-height preview box', () => {
  const img = css.match(/\.p-window img\{[^}]*\}/)?.[0] ?? '';
  assert.ok(img, '.p-window img rule exists');
  assert.ok(!/object-fit:\s*cover|scale\s*:|transform\s*:|height:\s*\d/.test(img), `screenshot rule must not crop or zoom: ${img}`);
  const visual = css.match(/\.p-visual\{[^}]*\}/)?.[0] ?? '';
  assert.ok(!/aspect-ratio|height:\s*\d/.test(visual), '.p-visual must size to its screenshot');
  assert.ok(!/\.p-window img\{[^}]*scale/.test(css) && !/\.p-window img\{[^}]*translate/.test(css));
  assert.match(read('script.js'), /querySelectorAll\('\.p-window'\)/, 'parallax moves the frame, not the image inside it');
});
