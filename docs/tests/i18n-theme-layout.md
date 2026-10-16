# Languages, RTL, theme, layout — test scenarios

Automated coverage: `tests/i18n.test.js` and `tests/markup.test.js` (`npm test`). Everything else is **Manual** in the browser.

| ID | Preconditions | Steps | Expected result | Type |
|----|---------------|-------|-----------------|------|
| I18N-01 | — | Compare keys of the FR / EN / AR dictionaries | Identical key sets | Auto |
| I18N-02 | — | Check every value | No empty value; `{placeholders}` identical across languages | Auto |
| I18N-03 | — | Check Arabic values | Contain Arabic script (except listed proper nouns) | Auto |
| I18N-04 | — | Collect `data-i18n*` keys in `index.html` and `t('…')` in `script.js` | Every key exists in all three dictionaries | Auto |
| I18N-05 | First visit, no saved language | Open the site with browser language fr / en / ar / other | Matching language, `other` → French; `<html lang dir>` set before first paint | Manual |
| I18N-06 | Site open | Click FR, EN, ع | All headings, nav, project texts, buttons, alt/aria labels, `<title>`, chatbot strings change; no mixed languages | Manual |
| I18N-07 | Arabic selected | Inspect layout | `dir="rtl"`; nav, header, timeline rail, bullets, project chips, badges, arrows, scroll progress and language meters mirror; emails/phone/tech tags stay LTR | Manual |
| I18N-08 | Arabic selected | Reload | Language persists (`localStorage aa-language`) | Manual |
| THEME-01 | No saved theme, OS dark | Open site | Dark theme, no flash of light | Manual |
| THEME-02 | No saved theme | Toggle OS colour scheme | Site follows live | Manual |
| THEME-03 | Any | Click the theme button | Smooth ~350 ms transition; `aria-label` updates in the active language; choice saved (`aa-theme-pref`) and reloaded | Manual |
| THEME-04 | Saved theme differs from OS | Reload | Saved theme wins | Manual |
| THEME-05 | Dark | Review every section, chat panel, project cards, code card, tech logos | No pure black/white surfaces; text contrast ≥ 4.5:1; logos readable on a light chip | Manual |
| LAY-01 | 375, 768, 1360 px | Scroll the whole page in FR, EN, AR | No horizontal overflow (`scrollWidth ≤ innerWidth`) | Manual |
| LAY-02 | ≤ 860 px | Open burger menu | Menu opens/closes with button, link click, Esc; `aria-expanded` and label update | Manual |
| LAY-03 | ≤ 560 px | Open chat | Full-screen panel; toggle and back-to-top hidden while open; input usable with the keyboard | Manual |
| LAY-04 | — | Check the 5 project cards | Same visual aspect ratio and no overlay labels; filters show/hide cards and expose `aria-pressed` | Manual |
| A11Y-01 | — | Tab through the page | Skip link first; visible focus on every control; logical order | Manual |
| A11Y-02 | `prefers-reduced-motion` | Reload | Marquee, float, reveal animations disabled | Manual |
| UI-01 | — | Inspect project previews and the portrait | No "real screenshot" / "illustrative mockup" labels and no "Java · Spring Boot" tag on the photo | Auto |
| UI-02 | Chat closed, desktop and mobile | Click both "My CV" buttons (hero and contact) in every language | CV PDF downloads; the chat widget never covers or blocks page buttons | Auto (markup) + Manual |
| UI-03 | Chat opened then closed | Click the "My CV" button under the widget's corner | Still clickable (`.chatbot` is click-through) | Manual |
| ANIM-01 | Scroll the page top to bottom | Watch sections | Blocks enter from different directions (left/right follow reading direction in RTL, zoom, blur), with staggered delays | Manual |
| ANIM-02 | Scroll to Skills / Projects / Experience | Watch cards | Tech chips, tags and bullets cascade in; section underline draws; timeline rail traces and markers pop | Manual |
| ANIM-03 | Load page / scroll | Watch hero and project previews | Hero stats count up (final values always shown, even in a background tab); hero glow, photo and project screenshots shift with scroll (parallax) | Manual |
| ANIM-04 | `prefers-reduced-motion: reduce` | Reload and scroll | No movement; all content visible immediately | Auto (CSS) + Manual |
