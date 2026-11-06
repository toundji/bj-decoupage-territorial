# bj-decoupage-territorial

API publique du découpage territorial du Bénin : **départements → communes → arrondissements → localités (villages / quartiers) → rues → bâtiments**, avec géométries PostGIS servies en GeoJSON et propositions citoyennes de noms de rues.

**Explorer les données en ligne : https://toundji.github.io/bj-decoupage-territorial/** (navigation, recherche, export JSON et SQL).

Refonte en NestJS du projet [bj-decoupage-territorial](https://github.com/nioperas06/bj-decoupage-territorial) (AdonisJS) de Junior Gantin, dont proviennent les données initiales.

## Stack

- [NestJS](https://nestjs.com/) 12 + TypeORM
- PostgreSQL + [PostGIS](https://postgis.net/) (SRID 4326) et l'extension `unaccent`
- Documentation OpenAPI / Swagger sur `/docs`

## Démarrage

Prérequis : Node.js 22+, PostgreSQL 15+ avec PostGIS.

```bash
cp .env.example .env            # puis renseigner les accès à la base
createdb bj_decoupage_territorial
npm install
npm run build
npm run seed                    # extensions, schéma, import des 12 / 77 / 546 / 5303 entités
npm run start:dev
```

- Page d'exploration : http://localhost:3000/
- API : http://localhost:3000/api/v1
- Swagger : http://localhost:3000/docs (JSON : `/docs/openapi.json`)

## Page d'exploration et version statique

`public/index.html` permet de parcourir départements → communes → arrondissements → localités, avec recherche et liens directs (`#/commune/16`, `#/localite/3402`…).

Servie par l'API, elle lit les données en direct. Sans API (GitHub Pages), elle lit l'instantané `public/data/decoupage.json`, à régénérer après chaque modification de la base :

```bash
npm run build
npm run export:json             # écrit public/data/decoupage.json
```

Le workflow `.github/workflows/pages.yml` publie `public/` sur GitHub Pages à chaque push sur `main` qui modifie ce dossier.

### Export des données

La barre « Exporter » de la page télécharge le Bénin entier, ou l'entité sélectionnée avec toutes ses subdivisions (ses parents sont inclus pour garder une hiérarchie complète) :

- **JSON** : arborescence imbriquée `departements[].communes[].arrondissements[].localites[]`, avec la portée et les totaux ;
- **SQL** : `CREATE TABLE IF NOT EXISTS` + `INSERT` (tables `departement`, `commune`, `arrondissement`, `localite`), en SQL standard pour PostgreSQL, MySQL / MariaDB et SQLite.

Les fichiers sont générés dans le navigateur, à partir de `GET /api/v1/export` (ou de l'instantané JSON sans API).

## Endpoints principaux

| Ressource | Routes |
|---|---|
| Départements | `GET /departements`, `/:id`, `/:id/homologue`, `/:id/communes`, `/:id/geometrie` |
| Communes | `GET /communes?departementId&statut&q`, `/:id`, `/:id/arrondissements`, `/:id/geometrie` |
| Arrondissements | `GET /arrondissements?communeId&departementId&q`, `/:id`, `/:id/localites`, `/:id/geometrie` |
| Localités | `GET /localites?arrondissementId&communeId&type&q`, `/:id`, `/:id/rues`, `/:id/geometrie` |
| Rues | `GET /rues?localiteId&communeId&type&q`, `/:id` (communes traversées déduites), `/:id/geometrie` |
| Propositions | `GET /rues/:rueId/propositions`, `POST /rues/:rueId/propositions` (sans compte) |
| Bâtiments | `GET /batiments?rueId&localiteId&usage&q`, `/:id`, `/:id/geometrie` |

Les listes sont paginées (`page`, `limit` ≤ 500) et renvoient `{ data, total, page, limit }`. La recherche `q` ignore casse et accents.

## Modèle

Voir [docs/diagramme-classes.md](docs/diagramme-classes.md).

## Licence

[MIT](LICENSE)
