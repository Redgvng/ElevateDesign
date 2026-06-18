# Alternatives Open Source

## Canvas

### Excalidraw

Avantages:

- open source;
- embeddable React;
- rapide pour MVP;
- UX connue;
- stockage JSON simple.

Inconvénients:

- custom shapes moins naturelles qu'un SDK canvas spécialisé;
- plus orienté dessin que produit design.

Usage recommandé:

- MVP.

### tldraw

Avantages:

- excellent SDK canvas;
- custom shapes;
- collaboration;
- performance;
- API très adaptée à un produit de design.

Inconvénients:

- licence à vérifier selon usage;
- intégration plus engageante.

Usage recommandé:

- V2 si le canvas devient la surface centrale.

### React Flow

Avantages:

- très bon pour graphes et workflows;
- nodes custom faciles;
- liens bien gérés.

Inconvénients:

- moins naturel pour un canvas libre de design.

Usage recommandé:

- agent manager ou workflow graph, pas canvas design principal.

## Preview et runtime

### Sandpack

Avantages:

- preview React rapide;
- bundler intégré;
- bonne DX;
- adapté à des artefacts type Claude.

Inconvénients:

- limites si projet Node complet;
- dépendances contrôlées à gérer.

Usage recommandé:

- MVP React preview.

### iframe custom

Avantages:

- contrôle sécurité;
- support HTML autonome;
- simple à comprendre.

Inconvénients:

- gestion console/errors à écrire;
- bundling non inclus.

Usage recommandé:

- HTML preview et production.

### WebContainers

Avantages:

- Node dans le navigateur;
- npm;
- projets complets;
- très puissant.

Inconvénients:

- complexité;
- support navigateur;
- plus lourd pour MVP.

Usage recommandé:

- V2 ou mode dev avancé.

## UI

### shadcn/ui

Avantages:

- code owned par le projet;
- bon avec Tailwind;
- très compatible avec génération IA;
- composants accessibles via Radix.

Inconvénients:

- demande discipline design;
- risque de look générique si mal guidé.

Usage recommandé:

- MVP et V2.

## Collaboration

### Yjs

Avantages:

- CRDT mature;
- fonctionne bien avec documents partagés;
- écosystème solide.

Inconvénients:

- demande design précis du modèle de synchronisation.

Usage recommandé:

- V2 collaboration.

## Exports

### Playwright

Avantages:

- screenshots fiables;
- PDF possible;
- tests e2e.

Usage recommandé:

- MVP.

### Figma Plugin API

Avantages:

- création de nodes éditables;
- intégration réelle dans Figma.

Inconvénients:

- développement plugin spécifique;
- mapping layout imparfait.

Usage recommandé:

- après export React/HTML.

