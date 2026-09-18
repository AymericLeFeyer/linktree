# Linktree AyLabs — instructions projet

> Dernière mise à jour : 2026-09-18

Page de liens façon linktree pour AyLabs. **React 19 + Vite 8 + TypeScript strict +
Tailwind 4**, pas de backend ni de backoffice : tout le contenu est dans
`links.json`, lu **au build uniquement**. Image Docker nginx publiée sur GHCR à
chaque push `main`.

## Structure

```
links.json                 # LE CONTENU (profil, réseaux, liens)
links.schema.json          # JSON Schema pour l'autocomplétion éditeur (pas la source de vérité)
public/links/              # images locales des liens → "/links/x.webp"
vite/linktreePlugin.ts     # plugin Vite : lit/valide links.json → module virtual:linktree
src/
├── domain/link/
│   ├── entities/Linktree.ts          # Linktree, Profile, Social, Link, SOCIAL_PLATFORMS
│   ├── repositories/LinktreeRepository.ts
│   └── services/
│       ├── expiry.ts                 # parseExpiry, isExpired, nextExpiry (Europe/Paris)
│       └── parseLinktree.ts          # validation stricte du JSON brut
├── application/link/usecases/GetVisibleLinktree.ts
├── infrastructure/link/repositories/BuildTimeLinktreeRepository.ts  # importe virtual:linktree
└── presentation/
    ├── dependencies.ts               # racine de composition (seul lien présentation → infra)
    ├── hooks/useVisibleLinktree.ts
    ├── components/                   # ProfileHeader, SocialLinks, SocialIcon, platformLabels, LinkCard
    └── pages/HomePage.tsx
```

Pas de routeur : une seule page. Pas de client HTTP : aucune donnée n'est
chargée à l'exécution.

## Domaine `link`

### Entités

- `Linktree { siteUrl?, profile, socials: Social[], links: Link[] }`
- `Profile { name, tagline?, description?, avatar }`
- `Social { platform: SocialPlatform, url, label? }`
- `Link { id, title, description?, url, image?, featured: boolean, expiresAt: number | null }`
  - `id` = `link-<index dans le JSON>` (clé React).
  - `expiresAt` est **déjà converti** en epoch ms ; la chaîne du JSON ne sort pas
    du domaine.

### Repository

`LinktreeRepository.get(): Linktree` — synchrone. Seule implémentation :
`BuildTimeLinktreeRepository`.

### Services

- `parseExpiry(value: string): number | null` — formats `YYYY-MM-DD` (visible
  toute la journée → expire le lendemain 00:00), `YYYY-MM-DDTHH:mm` (ou espace),
  ISO avec `Z`/`±HH:MM`. Sans fuseau explicite : **Europe/Paris**, changements
  d'heure gérés (`wallTimeToInstant` via `Intl.DateTimeFormat`). Date inexistante
  (`2026-02-30`) → `null`.
- `isExpired(link, now)` — vrai dès `now >= expiresAt`.
- `nextExpiry(links, now)` — prochaine échéance future ou `null`.
- `parseLinktree(raw, { assetExists? }): { ok: true, value } | { ok: false, errors: string[] }`
  — collecte **toutes** les erreurs, messages en français avec chemin
  (`links[2].expiresAt : …`).

### Use case

`new GetVisibleLinktree(repo).execute(now: Date): { linktree, refreshAt: number | null }`
— filtre les liens expirés, `refreshAt` = prochaine expiration parmi les visibles.

### Hook

| Hook                             | Rôle                                                                                                                                 |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `useVisibleLinktree(): Linktree` | exécute le use case, reprogramme un `setTimeout` sur `refreshAt` (plafonné à 2³¹−1 ms) pour masquer un lien expiré sans rechargement |

## Plugin Vite (`vite/linktreePlugin.ts`)

- `load("virtual:linktree")` : lit `links.json`, `parseLinktree` avec
  `assetExists` (chemin `/…` résolu dans `public/`), **lève une erreur → build en
  échec** si invalide, retire les liens déjà expirés, exporte le JSON.
- `transformIndexHtml` : remplace `<!-- linktree:head -->` dans `index.html` par
  `<title>`, description, Open Graph et Twitter tirés de `profile`. `og:image`,
  `og:url` et `canonical` seulement si `siteUrl` est renseigné (non défini
  aujourd'hui, domaine pas encore choisi).
- `configureServer` : en dev, modifier `links.json` invalide le module et
  recharge la page.

## Design

Charte reprise de `../aylabs` (voir son `CLAUDE.md`, section Design) — jetons
déclarés dans `@theme` de `src/index.css` :

| Jeton          | Valeur    | Usage                           |
| -------------- | --------- | ------------------------------- |
| `brand`        | `#398FBA` | bordures au survol, monogrammes |
| `brand-bright` | `#5FB6DE` | accroche, « À la une », survols |
| `brand-deep`   | `#2a6d94` | réservé (boutons pleins)        |
| `ink`          | `#0C1319` | fond de page                    |
| `ink-soft`     | `#141F27` | fond des cartes                 |
| `ink-line`     | `#22323D` | bordures                        |

Polices : Figtree (texte) et Bricolage Grotesque (`font-display`, titres), Google
Fonts dans `index.html`. Utilitaires maison : `bg-grid` (trame du hero aylabs),
`animate-rise` (entrée décalée via la variable `--delay`). Pas de bibliothèque de
composants : Tailwind + `lucide-react`.

**Nouvel onglet** : cartes et icônes réseaux passent par `newTabProps(url)`
(`src/shared/newTabProps.ts`) → `target="_blank" rel="noopener noreferrer"`,
sauf `mailto:`/`tel:` qui restent dans l'onglet (sinon onglet vide laissé
derrière). Tout nouveau lien sortant doit l'utiliser.

Colonne unique `max-w-xl`. Deux variantes de carte dans `LinkCard` : compacte
(vignette 64/72 px) et `featured` (image 16:9 pleine largeur). Image absente ou
cassée (`onError`) → monogramme de l'initiale.

## Déploiement

| Fichier                        | Rôle                                                                                                                                                       |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.github/workflows/deploy.yml` | job `check` (lint, format, tests, build) sur push/PR ; job `docker-image` sur push `main` et manuel → `ghcr.io/<owner>/linktree` (`latest`, `sha-…`, date) |
| `Dockerfile`                   | `node:24-alpine` build → `nginx:stable-alpine` port 80, `HEALTHCHECK` wget                                                                                 |
| `docker/nginx.conf`            | fallback `index.html`, cache 1 an sur `/assets/`, `index.html` jamais en cache, en-têtes de sécurité                                                       |
| `docker-compose.yml`           | service `linktree`, port `${LINKTREE_PORT:-8082}:80` (8080/8081 = stack aylabs)                                                                            |

## Commandes

`npm run dev` · `npm run build` (`tsc -b && vite build`) · `npm test` (vitest,
24 tests) · `npm run lint` · `npm run format` / `format:check` · `npm run check`
(tout, comme la CI).

## Points d'attention

- **Clés inconnues refusées** dans `links.json` : volontaire. Une faute de frappe
  (`expireAt`) rendrait sinon un lien temporaire permanent, en silence. Ajouter un
  champ = le déclarer dans `checkKeys` de `parseLinktree.ts` **et** dans
  `links.schema.json`.
- **Double filtrage des expirations** : au build (le lien n'est pas dans le
  bundle) et à l'affichage (le site peut rester des semaines sans rebuild). Ne pas
  supprimer l'un des deux. Un lien qui expire entre deux builds reste présent dans
  le JS servi, simplement masqué.
- **Fuseau fixe Europe/Paris** : ne jamais parser les dates avec `new Date("…")`
  sans fuseau — le runner CI est en UTC, le visiteur dans son fuseau.
- **Extensions `.ts` obligatoires** dans les imports de `vite.config.ts`,
  `vite/` et `src/domain/link/services/` : ces fichiers sont chargés avec la
  config Vite, et Vite 8 avertit (futur `configLoader: 'native'`) sinon. Le
  domaine doit aussi rester **sans API DOM** (il tourne dans Node au build).
- **lucide-react ≥ 1 n'a plus d'icônes de marques** (YouTube, Instagram,
  GitHub…) : tracés SVG en dur dans `SocialIcon.tsx`. Nouvelle plateforme =
  `SOCIAL_PLATFORMS` (entité) + `ICONS` (`SocialIcon.tsx`) + `PLATFORM_LABELS`
  (`platformLabels.ts`) + `enum` de `links.schema.json`.
- **Animations et survol** : `animate-rise` anime `transform`, le survol utilise
  `translate` (propriété distincte en Tailwind 4) — sinon le `fill-mode: both`
  de l'animation écraserait le décalage au survol.
- **Captures headless** : Edge/Chrome headless impose ~500 px de largeur minimale ;
  pour vérifier le mobile, charger la page dans une `<iframe>` de 320/375 px
  servie depuis la même origine.
- **`links.json` est exclu de Prettier** (`.prettierignore`) : il est édité à la
  main, souvent depuis l'éditeur web de GitHub, et une indentation décalée faisait
  échouer `format:check` en CI (2026-09-18) alors que le JSON était valide. Sa
  validité est contrôlée par le build, pas par Prettier. Ne pas le réintégrer.
- `.gitattributes` force LF : Prettier (`endOfLine: lf`) échouerait sinon en
  `format:check` sur un checkout Windows en CRLF.
- Paquet GHCR créé **privé** au premier push : le rendre public ou
  `docker login ghcr.io` sur le serveur.
