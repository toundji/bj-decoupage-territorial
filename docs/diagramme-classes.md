# Diagramme de classes — Découpage territorial du Bénin

Version 7 — validée le 2026-11-05.

```mermaid
classDiagram
direction TB
class Departement {
  +id : int
  +code : string
  +nom : string
  +groupe : string
  +chefLieuId : int [0..1]
  +geom : MultiPolygon [0..1]
  +homologue() Departement
}
class Commune {
  +id : int
  +code : string [0..1]
  +nom : string
  +statut : ORDINAIRE | PARTICULIER
  +departementId : int
  +chefLieuId : int [0..1]
  +geom : MultiPolygon [0..1]
}
class Arrondissement {
  +id : int
  +code : string [0..1]
  +nom : string
  +communeId : int
  +chefLieuId : int [0..1]
  +geom : MultiPolygon [0..1]
}
class Localite {
  +id : int
  +nom : string
  +type : VILLAGE | QUARTIER
  +arrondissementId : int
  +geom : MultiPolygon [0..1]
  +centre : Point [0..1]
}
class RueLocalite {
  <<liaison>>
  +rueId : int
  +localiteId : int
}
class Rue {
  +id : int
  +nom : string [0..1]
  +code : string [0..1]
  +type : RUE | AVENUE | BOULEVARD | ROUTE_NATIONALE
  +geom : MultiLineString [0..1]
}
class PropositionNomRue {
  +id : int
  +rueId : int
  +nomPropose : string
  +justification : text
  +auteurNom : string
  +auteurContact : string [0..1]
  +statut : EN_ATTENTE | ACCEPTEE | REJETEE
  +dateProposition : datetime
  +dateDecision : datetime [0..1]
  +motifDecision : text [0..1]
  +decideurId : int [0..1]
}
class Administrateur {
  +id : int
  +nom : string
  +email : string
  +motDePasse : string (hash)
}
class Batiment {
  +id : int
  +numero : string
  +usage : HABITATION | COMMERCE | ...
  +rueId : int
  +localiteId : int
  +position : Point [0..1]
  +emprise : Polygon [0..1]
}
Departement "1" *-- "1..*" Commune : contient
Commune "1" *-- "1..*" Arrondissement : contient
Arrondissement "1" *-- "1..*" Localite : contient
Localite "1" -- "0..*" RueLocalite
Rue "1" -- "1..*" RueLocalite : traverse
Rue "1" o-- "0..*" Batiment : dessert
Localite "1" o-- "0..*" Batiment : situe
Rue "1" *-- "0..*" PropositionNomRue : recoit
Administrateur "0..1" --> "0..*" PropositionNomRue : valide
Departement ..> Commune : chef-lieu
Commune ..> Arrondissement : chef-lieu
Arrondissement ..> Localite : chef-lieu
```

## Règles de gestion

- **Hiérarchie** : Département (12) → Commune (77) → Arrondissement (546) → Localité (village / quartier) → Rue → Bâtiment.
- **Groupe** : `Departement.groupe` vaut l'une des 6 valeurs `ATACORA-DONGA`, `ATLANTIQUE-LITTORAL`, `BORGOU-ALIBORI`, `MONO-COUFFO`, `OUEME-PLATEAU`, `ZOU-COLLINES`. `homologue()` renvoie l'autre département du même groupe.
- **Chefs-lieux** (optionnels) : un département pointe vers une de ses communes, une commune vers un de ses arrondissements, un arrondissement vers une de ses localités. Le chef-lieu doit appartenir à l'élément parent.
- **Rues** : une rue n'appartient à aucune commune ; elle est liée aux localités qu'elle traverse (`RueLocalite`, plusieurs-à-plusieurs). Elle peut donc traverser plusieurs communes ou départements ; les communes traversées sont déduites. Pas de tronçons pour l'instant.
- **Bâtiment** : rattaché à une rue et à une localité précises.
- **Propositions de nom de rue** : ouvertes à tous sans compte (`auteurNom`, `auteurContact` optionnel), statut initial `EN_ATTENTE`, validation ou rejet (avec motif) par un `Administrateur`. Une proposition acceptée recopie son nom dans `Rue.nom`. Les votes sont prévus pour plus tard.
- **Cartographie** : PostGIS, SRID 4326 (WGS84), toutes les géométries sont optionnelles ; l'API les expose en GeoJSON.
