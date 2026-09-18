# Linktree AyLabs

Page de liens aux couleurs d'[aylabs.fr](https://aylabs.fr). Tout le contenu est
dans **`links.json`** : on le modifie, on pousse sur `main`, une nouvelle image
Docker est publiée sur GHCR.

## Modifier les liens

```jsonc
{
  "title": "Code promo -20 % chez Domadoo", // obligatoire
  "description": "Valable sur toute la boutique.", // facultatif
  "url": "https://domadoo.fr/?domid=79", // obligatoire (https, mailto, tel)
  "image": "/links/domadoo.webp", // facultatif : fichier de public/ ou URL https
  "featured": true, // facultatif : grande carte avec image 16:9
  "expiresAt": "2026-10-31", // facultatif : date de fin, jamais affichée
}
```

- Les liens s'affichent **dans l'ordre du fichier**.
- Les images locales vont dans `public/links/` et s'écrivent `/links/nom.webp`.
  Vignette carrée pour un lien normal, 16:9 pour un lien `featured`. Sans image,
  la carte affiche l'initiale du titre.
- Les icônes sous le profil (`socials`) acceptent : `youtube`, `instagram`,
  `tiktok`, `discord`, `x`, `twitch`, `github`, `linkedin`, `email`, `website`.

### Dates de fin (`expiresAt`)

Toujours en **heure de Paris** :

| Valeur                        | Le lien disparaît le…            |
| ----------------------------- | -------------------------------- |
| `"2026-10-31"`                | 1er novembre à 00:00 (31 inclus) |
| `"2026-10-31T18:00"`          | 31 octobre à 18:00               |
| `"2026-10-31T18:00:00+02:00"` | à l'instant exact indiqué        |
| absent ou `null`              | jamais                           |

Le lien disparaît **à l'heure dite, même sans nouveau build** : la page refiltre
à l'affichage (et même si elle reste ouverte). Les liens déjà expirés au moment
du build ne sont pas du tout embarqués dans le site.

### Garde-fous

Le build **échoue** si `links.json` est invalide, avec la liste de toutes les
erreurs : champ inconnu (une faute de frappe sur `expiresAt` rendrait le lien
permanent), date illisible, URL incomplète, image absente de `public/`… Aucune
image n'est publiée tant que ce n'est pas corrigé.

Dans VS Code, `links.schema.json` fournit l'autocomplétion et signale les
erreurs pendant la saisie.

## Développement

```bash
npm install
npm run dev      # http://localhost:5173 — recharge à chaque modification de links.json
npm run check    # lint + format + tests + build, comme la CI
```

## Déploiement

`.github/workflows/deploy.yml`, à chaque push sur `main` : vérifications puis
image `ghcr.io/aymericlefeyer/linktree` (tags `latest`, `sha-…`, date). Les pull
requests passent les vérifications sans publier d'image.

Sur le serveur :

```bash
docker compose pull && docker compose up -d   # port 8082 par défaut (LINKTREE_PORT)
```

Le premier push crée le paquet GHCR en **privé** : le rendre public dans
_GitHub › Packages › linktree › Package settings_, ou faire un
`docker login ghcr.io` sur le serveur.
