# Portfolio v2 — UI/UX critique & redesign report

Branch: `v2` (from `master` @ 60ef898). Scope: visual identity, dark mode, project presentation, keyboard navigation.

## 1. Verdict on v1

v1 is technically solid: trilingual with real RTL, accessible markup, reduced-motion support, an AI assistant with an
offline fallback. The weaknesses are **visual identity** and **information architecture**, not engineering:

- It looks like a template (indigo → coral gradients, a lavender-on-navy dark mode, Inter + Space Grotesk).
- The project section, the most important part for a recruiter, is a wall of text with no way to go deeper.
- Too many decorative effects compete for attention.

## 2. Critical points (ranked by impact)

| # | Issue | Why it matters | v2 fix |
|---|---|---|---|
| 1 | **Project cards are dense**: 4 bullets + up to 10 tags each, in a 2-column grid, with no detail view | A recruiter scans for ~6 s per card. Everything has equal weight, so nothing stands out. Cards end up with very uneven heights | Card = screenshot, title, **one-line summary**, 5 tags + `+N`, "View case study". The full content moves to a **project detail drawer** |
| 2 | **Dark mode is navy monochrome** (`#0e1424` / `#172036` / `#8b8cf8`) | Everything is tinted blue, so the accent doesn't stand out against the background. It reads like a generic SaaS template. The contact section uses a darker navy (`#0a0f1d`, 1.04:1 against the page), so its "inverted" role disappears | Neutral **graphite** (`#0b0c0e` → `#18191d` → `#1f2125`), one saturated accent (jade `#3ddc97`), and a contact section separated by a border and accent glow instead of a near-identical shade |
| 3 | **Gradient overuse**: the same indigo→coral gradient on the name, brand mark, scroll bar, meters, photo frame, chat button and chat header | When everything is highlighted, nothing is. It also ties the brand to two colours that clash on dark | **One accent**, used flat: name, buttons, active states, live badges. Gradients are kept only for the per-project tint behind screenshots |
| 4 | **Motion overload**: float loop on the photo, blur reveal, parallax, marquee, counters, ring pulse, 9 reveal variants | Feels busy. The blur reveal is costly on low-end phones | Removed the photo float loop and the blur variant, made the reveal distances shorter. Kept the meaningful motion (counters, timeline drawing, marquee with pause) |
| 5 | **Micro-typography**: lots of 10–11 px monospace uppercase labels (`nav-num`, `c-label`, filter counts, chips) | Below a comfortable reading size, especially in Arabic, where uppercase does nothing | Minimum 11.5–12 px. Uppercase only on drawer section headings, and turned off in Arabic |
| 6 | **Redundant "3+ years"**: in the photo badge, the stats row and the hero copy | Wastes the most visible spot on the page | The badge now says **"Currently at Proxym IT"** (new information) |
| 7 | **Header crowding** at 1080–1380 px: 6 links + numbers + CTA + language switch + theme toggle | The CTA wrapped onto two lines and the language switch was cut off at 1280 px (seen in the browser) | Nav numbers and the search label hide below 1380 px, the CTA below 1240 px, and the CTA no longer wraps |
| 8 | **Horizontal scroll on mobile** (bug): the code card's `<pre>` widened its grid column, so the page scrolled 22 px sideways at 375 px | Broken feel on every phone | `.profil-grid > * { min-width: 0 }` |
| 9 | **Static `theme-color`**: the browser bar follows the system theme, not the theme toggle | On mobile the address bar mismatches the page after toggling | `syncThemeColor()` updates the meta tag from `--bg` |
| 10 | **Hard-coded filter counts** (`<em>5</em>` …) | They go stale as soon as a project is added | Counts are computed from `data-cat` |
| 11 | **No keyboard power-user path**: a long single page with 6 sections and 5 projects | Navigating means scrolling or tabbing through everything | **Command palette** (Ctrl/⌘ K, `/`) |

## 3. Design system v2

### Palette

| Token | Light | Dark (v1 → v2) |
|---|---|---|
| `--bg` | `#f7f7f4` (warm paper) | `#0e1424` → **`#0b0c0e`** graphite |
| `--surface` | `#ffffff` | `#172036` → **`#18191d`** |
| `--ink` | `#121513` (17.1:1) | **`#ededee`** (16.7:1) |
| `--muted` | `#5b625e` (5.8:1) | **`#92969e`** (6.6:1 on bg, 5.4:1 on surface-2) |
| `--accent` (jade) | `#047857` — white text 5.5:1 | `#8b8cf8` → **`#3ddc97`** — dark text 10.7:1 |
| `--accent-ink` | `#065f46` (7.2:1) | **`#5ee9ac`** (12.8:1) |

All text pairs pass WCAG AA; most pass AAA. Every tint (glow, hover border, focus ring, soft background) is derived
from `--accent` with `color-mix()`, so **one variable recolours the whole site**.

**Accent options** (switchable in the command palette, saved per visitor): **Jade** (default: finance, growth, and
distinct from the usual indigo), **Violet** (close to v1, 7.0–7.1:1) and **Ocean** (5.9–8.8:1).

Why jade: v1's indigo and lavender are the default of countless portfolio templates. A deep green reads as "finance"
and "trust", fits the banking work, and stays vivid on graphite without vibrating.

### Typography

- **Geist** (sans) + **Geist Mono** replace Inter / Space Grotesk / JetBrains Mono: the same neutral look, but tighter
  and more current. One family for headings and body gives a calmer page.
- **Instrument Serif italic** on one word, the surname in the hero, the brand mark, the chat avatar and the education
  numbers. It's the single "editorial" signature.
- Arabic still uses **IBM Plex Sans Arabic** through glyph fallback, with Arabic-specific letter-spacing and line-height kept.

### Components

- Neutral **active states** (ink pill) for filters and language: the accent is kept for actions.
- **Live badges** get a status dot. The timeline uses thinner 1 px rails.
- Contact cards are left-aligned with a tinted icon (they were centred with gradient icons).
- Chat: neutral header (it was a purple gradient), user bubbles in ink, an accent "online" dot on the launcher.

## 4. New features (trends)

### Project case-study drawer

- Every card has a **"View case study"** button. The whole card is clickable through a stretched link, and the button
  keeps its accessible name, with the project title as its description.
- The drawer shows a large screenshot, **Role / Company / Period**, **Context** (new copy), **What I did** (the
  original bullets), the **full stack** and a **"Ask the assistant"** button. That button closes the drawer, opens the
  chatbot and asks about this project.
- **Deep links**: `#project-mycoris`, `#project-bankerise`, `#project-cbs-mock`, `#project-bna-h24`,
  `#project-allsystems`. Without JS these anchors still scroll to the card.
- Previous / next buttons plus **←/→** (reversed in RTL), counter `02 / 05`, and it respects the active filter.
- Native `<dialog>` (focus trap, Esc, inert background). Animated close, focus returns to the opener. Side drawer on
  desktop (on the left in Arabic), bottom sheet below 640 px.
- **No duplicated data**: the drawer clones the card's translated DOM, so language switches update it live, and
  `i18n.js` stays the single source. The chatbot's knowledge now includes each project's role and context.

### Command palette (⌘K / Ctrl K / `/`)

- Groups: **Go to** (sections), **Projects**, **Actions** (download CV, copy email with a toast, write an email,
  LinkedIn, GitHub, back to top), **Preferences** (theme light/dark/system, language, accent).
- Accent- and case-insensitive matching with **multilingual keywords** ("skills" finds المهارات in the Arabic UI),
  tag search ("kube" finds the Kubernetes projects), and the match highlighted.
- **AI fallback**: the last row is always "Ask the assistant: «…»", which turns any search into a chatbot question.
- ARIA combobox + listbox with `aria-activedescendant`, ↑/↓/PageUp/PageDown, Enter, Esc. The shortcut shows ⌘ on Mac.

### Smaller touches

- **Circular theme reveal** with the View Transitions API, starting from the toggle (falls back to a cross-fade, and
  is off with reduced motion).
- **Local time in Sousse** next to the location (`17:16 heure locale`), localized per language.
- **Pointer-following glow** on project cards (mouse only, off with reduced motion).
- Featured first project spans the full width (bento-style).
- The footer hints at `Ctrl K`.

## 5. Verified

- `node --test tests/*.test.js`: **37/37 pass**. `npm run lint`: 14/14 files OK.
- Browser checks: dark, light and the violet accent; EN / FR / **AR (RTL drawer on the left, Arabic search, Arabic
  local time)**; 1280 px and 375 px. No horizontal overflow at 375 px. No console errors.
- Drawer: open, deep link, ←/→, Esc, focus return, hash restored. Palette: Ctrl K, search, Enter, accent saved.

## 6. Not done / to review

1. **New copy needs Asma's review**: the five *Context* paragraphs and one-line summaries (`p1Summary`…`p5Context`, in 3
   languages) are written from the existing bullets. They should be checked for accuracy and for anything under NDA.
2. **`npm test` fails on Node 23** (on `master` too): `node --test tests/` no longer accepts a bare directory. Running
   `node --test tests/*.test.js` works. The script should be updated once the minimum Node version is decided.
3. **Impact numbers are missing**: case studies would be much stronger with one measurable outcome each (latency, number
   of tenants, test coverage…). Add `pNImpact` keys when real numbers are available.
4. Screen-reader pass (NVDA/VoiceOver) on the palette and drawer has not been done. Only the ARIA structure was checked.
5. Fonts still come from Google Fonts. Self-hosting Geist would remove a third-party request and the font-swap flash.
