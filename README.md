# Portfolio — Asma Ajmi

Portfolio professionnel (HTML / CSS / JavaScript, sans framework front) servi par un petit
serveur Node qui héberge aussi le **chatbot IA** (proxy sécurisé vers l'API Claude).

- 3 langues : **français, anglais, arabe** (RTL complet pour l'arabe)
- thème **clair / sombre** (préférence enregistrée, sinon thème du système)
- chatbot IA contextuel, avec réponses de secours hors ligne
- le site reste utilisable en **hébergement statique** : sans backend, le chatbot passe automatiquement en mode hors ligne

## Lancer en local

```bash
npm install
cp .env.example .env      # puis renseigner ANTHROPIC_API_KEY
npm start                 # http://127.0.0.1:5173
```

Sans clé API le site fonctionne ; le chatbot répond alors avec de courtes réponses locales.

| Commande | Rôle |
|---|---|
| `npm start` | serveur (fichiers statiques + `/api/chat` + `/api/health`) |
| `npm run dev` | idem avec rechargement automatique |
| `npm run lint` | vérification de syntaxe de tous les fichiers JS |
| `npm test` | tests unitaires et d'intégration (Node ≥ 18, `node:test`) |

## Variables d'environnement

Voir `.env.example`. **La clé n'est jamais envoyée au navigateur** : seul le serveur parle à l'API.

| Variable | Défaut | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | — | clé API Claude (obligatoire pour l'IA) |
| `ANTHROPIC_MODEL` | `claude-opus-5-5` | modèle utilisé |
| `ANTHROPIC_EFFORT` | `low` | `low` / `medium` / `high` : profondeur de réflexion, donc coût et latence |
| `ANTHROPIC_FALLBACKS` | `default` | mettre `off` pour désactiver le repli serveur en cas de refus (API Claude uniquement) |
| `PORT` / `HOST` | `5173` / `127.0.0.1` | écoute ; `HOST=0.0.0.0` en conteneur |
| `CHAT_RATE_LIMIT_PER_MINUTE` | `8` | requêtes chat par IP et par minute |
| `CHAT_RATE_LIMIT_PER_DAY` | `100` | requêtes chat par IP et par jour |
| `ALLOWED_ORIGINS` | vide | origines autorisées pour `/api/chat` (vide = toutes) |
| `TRUST_PROXY` | `0` | `1` derrière un reverse proxy de confiance (utilise `X-Forwarded-For`) |

## Architecture du chatbot

```
navigateur ──POST /api/chat──▶ server/app.js ──▶ server/chat.js ──▶ API Claude
  historique (sessionStorage)    limite de débit      validation + prompt système
  réponses locales si échec      origine, taille      (construit depuis i18n.js)
```

- `server/knowledge.js` construit le prompt système **à partir du contenu du site** (`i18n.js`, version anglaise) :
  le chatbot ne peut donc pas diverger du portfolio. Il répond dans la langue du dernier message du visiteur.
- `server/chat.js` valide la requête (taille, rôles, historique), appelle Claude et convertit les erreurs en codes
  sûrs (`rate_limited`, `unavailable`, `too_long`…) : aucun message d'erreur amont n'est renvoyé au navigateur.
- `server/app.js` n'expose que `index.html`, `styles.css`, `script.js`, `i18n.js` et `assets/` — jamais `.env`,
  `server/`, `tests/` ni `node_modules`.
- Limite de débit en mémoire (instance unique). Avec plusieurs instances, utiliser un stockage partagé (Redis…).

## Structure

```
portfolio/
├── index.html        # contenu (attributs data-i18n* pour la traduction)
├── styles.css        # design system : tokens, thèmes clair/sombre, propriétés logiques (LTR/RTL), responsive
├── script.js         # thème, langue, navigation, animations, filtres, chatbot (client)
├── i18n.js           # dictionnaires FR / EN / AR (mêmes clés partout, vérifié par les tests)
├── server/           # serveur Node : app, chat, knowledge, rate-limit, env
├── tests/            # node:test — i18n, rate limit, chat, serveur HTTP
├── docs/tests/       # scénarios de test (automatiques + manuels)
└── assets/           # photo, CV, logos techno, captures de projets (WebP)
```

## Internationalisation

- Texte : `data-i18n="clé"` (texte), `data-i18n-html="clé"` (HTML simple), `data-i18n-attr="aria-label:clé;alt:clé"` (attributs).
- Ajouter ou modifier un texte : éditer **les trois** dictionnaires dans `i18n.js` ; `npm test` échoue si une clé manque
  ou si une clé utilisée dans `index.html` / `script.js` n'existe pas.
- La langue est détectée avant le premier rendu (préférence enregistrée, sinon langue du navigateur, sinon français).
- Mise en page en propriétés logiques CSS (`inline-start/end`) : le RTL n'a que quelques surcharges ciblées
  (flèches retournées, jauges, cadre photo).
- Les contenus techniques (noms de technologies, e-mail, téléphone) restent en LTR dans la page arabe.

## Projets : visuels

Les cinq cartes affichent un cadre de fenêtre à ratio constant, sur un fond teinté propre à chaque projet.
Les captures sont **réelles** (WebP optimisés dans `assets/projects/`), sauf **CBS Mock** : aucune capture publiable
n'existait, la carte affiche donc une **maquette illustrative** (`assets/projects/cbs-mock.svg`) clairement étiquetée
« Maquette illustrative ». Pour la remplacer, déposer une capture `cbs-mock.webp` et changer le `src` de la carte.
Les anciennes captures PNG et les SVG historiques restent dans `assets/projects/` mais ne sont plus référencés.

## Remplacer la photo

Déposer `assets/asma_photo.webp` (portrait ≈ 4:5, 720 × 900). Un visuel de remplacement s'affiche si le fichier est absent.

## Déploiement

- **Avec chatbot IA** : n'importe quel hébergement Node (`npm start`, variables d'environnement définies sur la plateforme,
  `HOST=0.0.0.0`, `TRUST_PROXY=1` derrière un proxy).
- **Statique uniquement** (GitHub Pages, Netlify…) : publier `index.html`, `styles.css`, `script.js`, `i18n.js` et
  `assets/`. Le chatbot détecte l'absence de `/api` et utilise ses réponses locales.
- Ne jamais publier `.env`.

## À vérifier

- Les URLs **LinkedIn** (`/in/asmaajmi`) et **GitHub** (`/asmaajmi`) sont déduites du CV : à corriger dans `index.html`
  et `i18n.js`/`server/knowledge.js` si les profils réels diffèrent.
- Les dates des projets ont été reconstituées à partir du CV (MyCoris juin 2024 →, Bankerise déc. 2024 →, CBS Mock en cours,
  BNA H24 nov. 2023 – nov. 2024, ERP fév. – juin 2023).
