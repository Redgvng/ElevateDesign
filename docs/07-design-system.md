# Design System et DESIGN.md

## Objectif

Le DESIGN.md donne à l'agent une mémoire portable du style du projet. Il doit être lisible par un humain et exploitable par un modèle.

## Rôle

Le design system influence:

- couleurs;
- typographie;
- densité;
- spacing;
- radius;
- ombres;
- ton rédactionnel;
- composants préférés;
- patterns interdits.

## Format DESIGN.md

```md
# Design System

## Product

Name: Open Design Canvas
Audience: product builders, frontend engineers, technical designers
Tone: precise, calm, technical

## Visual Direction

The UI should feel like a serious product tool. It should be dense, readable and work-focused.

## Colors

- background: #f7f7f4
- surface: #ffffff
- text: #171717
- muted: #6b6b63
- primary: #2563eb
- accent: #0f766e
- danger: #dc2626

## Typography

- headline: Space Grotesk
- body: Source Sans 3
- mono: JetBrains Mono

## Layout

- prefer compact panels;
- avoid oversized marketing hero layouts;
- use predictable navigation;
- keep cards at 8px radius or less.

## Components

- primary actions are compact buttons;
- use tables for dense data;
- use tabs for alternate views;
- use icon buttons for canvas tools.

## Avoid

- generic purple gradients;
- excessive centered layouts;
- decorative blobs;
- oversized rounded cards;
- text that explains obvious UI controls.
```

## Tokens extraits

Le système parse DESIGN.md vers DesignTokens.

```ts
type ParsedDesignMd = {
  product: {
    name: string;
    audience: string;
    tone: string;
  };
  visualDirection: string;
  colors: Record<string, string>;
  typography: Record<string, string>;
  layoutRules: string[];
  componentRules: string[];
  avoidRules: string[];
};
```

## Application aux générations

Le contexte envoyé au modèle doit inclure:

- prompt utilisateur;
- résumé du DESIGN.md;
- tokens;
- exemples de composants existants si disponibles;
- contraintes de runtime.

## UI d'édition

MVP:

- éditeur Markdown;
- aperçu tokens extraits;
- bouton "appliquer aux futures générations".

V2:

- extraction depuis URL;
- extraction depuis codebase;
- validation contraste;
- palette editor;
- typographic scale editor.

## Règles

- DESIGN.md est versionné avec le projet.
- Une génération conserve le designSystemId utilisé.
- Modifier DESIGN.md ne réécrit pas automatiquement les anciennes versions.
- Une action explicite peut régénérer un écran avec le nouveau design system.

