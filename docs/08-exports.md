# Exports

## Objectif

Les exports transforment une ScreenVersion en artefact utilisable hors du produit.

## Exports MVP

### HTML autonome

Produit:

- un fichier `.html`;
- CSS inline ou embarqué;
- JavaScript minimal;
- assets en data URLs ou chemins relatifs.

Usage:

- partage rapide;
- preview sans projet;
- import dans d'autres outils.

### React/Tailwind

Produit:

- `App.tsx`;
- composants dans `components/`;
- `tailwind.config.ts`;
- `package.json`;
- README d'intégration.

Usage:

- point de départ pour développeur frontend;
- reprise dans une app existante.

## Exports V2

### Figma

Approche recommandée:

- créer un plugin Figma;
- envoyer un payload structuré depuis Open Design Canvas;
- créer des frames, textes, rectangles, images et composants via Plugin API.

Ne pas compter uniquement sur la REST API Figma pour écrire dans un fichier. La REST API est surtout utile pour lire, synchroniser ou inspecter. L'écriture éditable passe mieux par le Plugin API.

### PDF

Usage:

- partage client;
- revue produit;
- snapshot de flow.

Approche:

- Playwright print to PDF;
- exporter chaque écran ou flow.

### PPTX

Usage:

- pitch deck;
- revue stakeholder;
- documentation produit.

Approche:

- générer slides depuis screenshots et notes;
- garder chaque écran comme image avec annotations.

## API d'export

```ts
type ExportRequest = {
  screenVersionId: string;
  format: "html" | "react" | "figmaPayload" | "pdf" | "pptx";
  options: {
    includeAssets?: boolean;
    inlineCss?: boolean;
    includeReadme?: boolean;
  };
};
```

```ts
type ExportResult = {
  artifactId: string;
  format: string;
  downloadUrl: string;
  expiresAt: string | null;
};
```

## Règles

- Exporter depuis ScreenVersion, pas depuis Screen.
- Stocker l'export comme Artifact.
- Conserver les logs de génération si l'export échoue.
- Les exports doivent être reproductibles.

## Qualité attendue

### HTML

- Ouvre sans build.
- Ne charge pas de dépendances externes non nécessaires.
- Respecte le viewport cible.

### React

- Compile dans un projet Vite neuf.
- Utilise des composants lisibles.
- Evite les fichiers géants.
- N'introduit pas de dépendances inattendues.

### Figma

- Produit des frames éditables.
- Texte reste texte.
- Images restent images.
- Layout approximé avec auto-layout quand possible.

