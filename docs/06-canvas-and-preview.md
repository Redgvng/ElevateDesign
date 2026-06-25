# Canvas et Preview

## Objectif

Le canvas organise les idées. La preview exécute le rendu. Les deux surfaces ne doivent pas être confondues.

## Canvas

### Rôle

Le canvas affiche des objets de travail:

- prompts;
- écrans;
- variantes;
- images;
- notes;
- extraits de code;
- design systems.

Un écran sur le canvas utilise un screenshot comme aperçu. La preview live est ouverte dans un panneau dédié.

### MVP avec Excalidraw

Excalidraw est utilisé comme composant React embeddé.

Fonctions attendues:

- créer un élément pour chaque Screen;
- stocker x, y, width, height;
- mettre à jour la position;
- afficher un aperçu image;
- représenter les liens entre écrans.

### Limites Excalidraw

- Moins adapté à des custom shapes riches.
- Intégration produit plus contrainte.
- Certaines interactions avancées demanderont des contournements.

### Migration possible vers tldraw

tldraw devient pertinent si:

- le canvas devient le centre produit;
- on veut custom shapes riches;
- on veut collaboration plus avancée;
- la licence est acceptable.

## Preview

### Rôle

La preview rend le HTML ou React généré dans un environnement isolé.

### MVP

- HTML: iframe sandbox.
- React: Sandpack.
- Console: capture minimale des erreurs.
- Responsive: presets mobile, tablet, desktop.

### Preview HTML

```html
<iframe
  sandbox="allow-scripts"
  referrerpolicy="no-referrer"
  title="Generated preview"
></iframe>
```

Le contenu est injecté via `srcdoc` pour le MVP local. En production, préférer un sous-domaine séparé.

### Preview React

Sandpack fournit:

- transpilation;
- rendu React;
- boundary d'erreur;
- mapping de fichiers;
- intégration rapide dans l'UI.

## Communication parent-preview

Utiliser `postMessage` avec messages typés.

```ts
type PreviewMessage =
  | { type: "preview:ready" }
  | { type: "preview:error"; error: string; stack?: string }
  | { type: "preview:console"; level: "log" | "warn" | "error"; args: unknown[] }
  | { type: "preview:resize"; width: number; height: number };
```

Le parent doit vérifier:

- origine;
- shape du message;
- id de preview;
- taille maximale du payload.

## Screenshots

Les screenshots sont pris côté worker avec Playwright.

Pipeline:

1. charger HTML dans une page isolée;
2. attendre network idle ou timeout contrôlé;
3. capturer console et erreurs;
4. prendre screenshot PNG ou WebP;
5. stocker l'image;
6. attacher l'artifact à la ScreenVersion.

Etat MVP actuel:

- le worker sait rendre un HTML en PNG avec Playwright;
- la génération attache un `screenshotArtifactId` à la `ScreenVersion` quand la capture réussit;
- les screenshots sont stockés comme artefacts et consultables via l'API d'artefacts;
- la preview peut afficher le HTML live ou le screenshot persistant en mode Snapshot;
- l'ouverture d'un workspace peut réhydrater la preview depuis la version courante d'un screen déjà présent sur le canvas;
- l'affichage direct des screenshots dans les nodes Excalidraw reste à brancher.

## Performance

### Canvas

- Utiliser des images optimisées pour les previews.
- Ne pas rendre 100 iframes live sur le canvas.
- Virtualiser si le nombre de nodes devient élevé.

### Preview

- Une seule preview live active par défaut.
- Nettoyer les iframes non utilisées.
- Limiter les bundles.

## Etats UI

- idle;
- generating;
- rendering;
- ready;
- runtime_error;
- validation_error;
- export_ready.

## Règles de sécurité

- Ne jamais exécuter de code généré dans le DOM principal.
- Ne pas autoriser `allow-same-origin` dans le MVP iframe.
- Bloquer navigation top-level.
- Bloquer formulaires sauf besoin explicite.
- Bloquer accès réseau externe dans les environnements de rendu serveur quand possible.
