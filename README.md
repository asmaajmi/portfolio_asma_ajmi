# Portfolio — Asma Ajmi

Portfolio professionnel statique (HTML / CSS / JavaScript, sans framework ni build),
généré à partir du CV `RenderCV_Classic_Theme__1_.pdf`.

## ➜ Ajouter votre photo de profil

Déposez votre portrait ici, avec **exactement ce nom** :

```
assets/profile.jpg
```

- Format conseillé : **portrait**, ratio ~5:6 (ex. 800 × 960 px), visage centré en haut.
- Tant que le fichier est absent, un visuel de remplacement s'affiche automatiquement
  (`assets/profile-placeholder.svg`) — aucun réglage à faire.
- Pour un cadrage différent : `styles.css` → `.photo-holder img { object-position: … }`.

## ➜ Remplacer les visuels des projets

Chaque projet affiche un **aperçu d'écran d'accueil** dessiné en SVG (`assets/projects/`).
Pour mettre une vraie capture à la place — quand elle est publiable :

1. Enregistrez la capture dans `assets/projects/` (ex. `mycoris.png`), format **880 × 520** ou tout ratio 16/9.
2. Dans `index.html`, changez l'extension du `src` de la carte concernée :
   `src="assets/projects/mycoris.svg"` → `src="assets/projects/mycoris.png"`.

L'attribut `data-remplacer-par` sur chaque `<img>` rappelle le chemin attendu.
Les aperçus SVG restent parfaitement présentables si les écrans réels sont confidentiels.

## Structure

```
portfolio/
├── index.html          # contenu complet (profil, expérience, projets, compétences, formation, contact)
├── styles.css          # design system : variables CSS, thème clair/sombre, responsive, impression
├── script.js           # thème, menu mobile, scroll spy, animations, filtres projets, jauges
├── assets/
│   ├── profile.jpg            ← VOTRE PHOTO (à ajouter)
│   ├── profile-placeholder.svg
│   ├── CV-Asma-Ajmi.pdf       # CV téléchargeable depuis le hero et la section contact
│   ├── favicon.svg
│   ├── projects/              # 5 aperçus « écran d'accueil » (SVG)
│   │   ├── mycoris.svg  bankerise.svg  cbs-mock.svg
│   │   └── bna-h24.svg  erp-allsystems.svg
│   └── tech/                  # 24 logos de technologies (SVG) affichés dans Compétences
└── .claude/launch.json # config du serveur local de prévisualisation
```

## Lancer en local

```bash
python -m http.server 5173
```

Puis ouvrir http://localhost:5173

## Parti pris graphique

- **Aucun dégradé** : toutes les couleurs sont des aplats (`background-color` uniquement).
  La profondeur vient des bordures, des décalages de blocs, des ombres et des motifs de points SVG.
- Palette **encre marine `#14203A` + vermillon `#D64525`** sur papier chaud `#F4F1EB`
  (version sombre : `#0C111B` / `#FF6B45`).
- Typographie : **Space Grotesk** (titres) + **Inter** (texte) + **JetBrains Mono** (badges, code, numéros).
- Éléments marquants : photo encadrée avec bloc décalé et badges flottants, bandeau
  défilant de technologies, aperçus d'écran en tête de chaque projet, tuiles à logos
  dans les compétences, section contact inversée.
- Tous les visuels (aperçus projets, logos, remplacement photo, favicon) sont des SVG
  locaux : aucune dépendance externe, aucun CDN d'images.
- Thème clair/sombre automatique + bouton, mémorisé en `localStorage`.
- Accessible : lien d'évitement, focus visibles, `prefers-reduced-motion`, contrastes AA.

## Personnalisation rapide

| Quoi | Où |
|---|---|
| Couleur d'accent | `styles.css` → `--accent`, `--accent-ink`, `--accent-soft` |
| Couleur marine | `styles.css` → `--navy`, `--invert-bg` |
| Textes / projets | `index.html` (sections commentées) |
| Filtres projets | attribut `data-cat` sur chaque `<article class="p-card">` |
| Chiffres du hero | `<ul class="hero-stats">` dans `index.html` |
| Logo d'une techno | remplacer le fichier `assets/tech/<nom>.svg` (30 × 30 à l'affichage) |
| Ajouter une techno | `<li><img src="assets/tech/x.svg" alt="" width="30" height="30" /><span>X</span></li>` |
| Niveaux de langues | attribut `data-level` sur `<span class="meter">` |

## À vérifier / compléter

- Les URLs **LinkedIn** (`/in/asmaajmi`) et **GitHub** (`/asmaajmi`) sont déduites des
  identifiants du CV — à corriger dans `index.html` si les profils réels diffèrent.
- Le CV liste les dates dans une colonne séparée ; l'association projet ↔ période a été
  reconstituée dans cet ordre : MyCoris (juin 2024 →), Bankerise (déc. 2024 →), CBS Mock
  (en cours), BNA H24 (nov. 2023 – nov. 2024), ERP AllSystems (fév. – juin 2023).

## Déploiement

Site 100 % statique : déployable tel quel sur GitHub Pages, Netlify, Vercel ou tout
hébergement classique (glisser-déposer du dossier).
