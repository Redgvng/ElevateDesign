# UI Module Library Implementation Plan

> Ce plan introduit une bibliothèque de modules UI pour diversifier les générations sans remplacer `DesignSpec` comme source de vérité.

**Goal:** créer un catalogue de modules UI data-only, validé par Zod, utilisable par le pipeline de génération pour produire des `DesignSpec` plus variés et mieux structurés.

**Architecture:** les modules décrivent des intentions, slots, contraintes et variantes de composition. Le générateur les utilise comme contexte structuré pour produire un `DesignSpec` complet. shadcn/ui reste un vocabulaire de rendu et une cible d'export React/Tailwind, pas une source canonique.

**Documents à lire avant implémentation:**

1. `docs/01-product-spec.md`
2. `docs/02-architecture.md`
3. `docs/03-tech-stack.md`
4. `docs/04-data-model.md`
5. `docs/05-ai-pipeline.md`
6. `docs/07-design-system.md`
7. `docs/08-exports.md`
8. `docs/09-security.md`
9. `docs/plans/10-durable-product-foundation.md`
10. `docs/agent-playbooks/generation-pipeline-builder.md`
11. `docs/agent-playbooks/frontend-builder.md`

## Principes non négociables

- `DesignSpec` reste la source de vérité d'un écran.
- Un module ne contient pas de JSX, HTML exécutable, JavaScript arbitraire ou import npm dynamique.
- Un écran doit rester compilable si les métadonnées de module sont supprimées.
- Les modules guident la composition, pas les couleurs finales: le design system reste responsable du style.
- Les modules sont versionnés, validés par Zod et testés par fixtures.
- Le worker ne doit jamais envoyer tout le catalogue au modèle; il sélectionne un sous-ensemble borné.
- shadcn/ui est utilisé comme vocabulaire de primitives et cible d'export React, jamais comme format stocké.

## Modèle cible

```ts
type ModuleDefinition = {
  id: string;
  version: string;
  family:
    | "app-shell"
    | "navigation"
    | "dashboard"
    | "data-display"
    | "form"
    | "auth"
    | "marketing"
    | "pricing"
    | "settings"
    | "feedback";
  name: string;
  description: string;
  intentTags: string[];
  useWhen: string[];
  avoidWhen: string[];
  deviceSupport: Array<"mobile" | "tablet" | "desktop" | "agnostic">;
  slots: ModuleSlot[];
  variants: ModuleVariant[];
  selectionHeuristics: ModuleSelectionHeuristics;
  designSpecHints: {
    allowedNodeTypes: string[];
    maxDepth: number;
    responsiveBehavior: string[];
  };
  shadcnHints: {
    primitives: string[];
    registryItems: string[];
    compositionNotes: string[];
  };
  accessibilityNotes: string[];
};
```

Un futur `ScreenPlan` pourra tracer la sélection:

```ts
type ScreenPlan = {
  screenIntent: string;
  audience: string;
  deviceType: string;
  selectedModules: Array<{
    moduleId: string;
    variantId: string;
    reason: string;
    slots: Record<string, unknown>;
  }>;
  variationAxes: {
    density: string;
    navigation: string;
    contentVolume: string;
    visualTone: string;
  };
};
```

Chaque `ModuleVariant` porte aussi des `promptSignals`. Ces signaux relient explicitement une intention utilisateur à une variante de composition, par exemple `incident`, `war room` ou `live queue` vers un dashboard `incident-command`. Le catalogue MVP reste volontairement borné à quatre variantes par module pour maximiser la qualité et éviter une expansion incontrôlée.

## Catalogue MVP

### Priorité 1

- `app-shell.sidebar-dashboard`: sidebar, topbar compacte, zone contenu.
- `dashboard.metric-overview`: KPI cards, chart principal, table ou feed.
- `data-display.table-with-filters`: toolbar, filtres, tri, pagination.
- `form.settings-form`: sections de formulaire, save bar, validation.
- `feedback.empty-state-action`: état vide avec action principale.
- `feedback.error-state-retry`: erreur contrôlée avec retry et détails.

### Priorité 2

- `auth.sign-in`: login, signup, magic link, reset password.
- `marketing.hero-with-proof`: hero sobre, preuves, logos, CTA.
- `pricing.tiers-comparison`: cards tarifaires et matrice de features.
- `settings.account-layout`: nav latérale, sections account/billing/security.
- `data-display.activity-feed`: timeline, audit log, notifications.
- `dashboard.ops-command-center`: incidents, queues, charts, status board.

## Jalon 0 — Contrats de modules

### Objectif

Créer les types partagés et schémas Zod sans changer le pipeline de génération.

### Fichiers cibles

- `packages/shared/src/module-catalog.ts`
- `packages/shared/src/module-catalog.test.ts`
- `packages/shared/src/index.ts`

### Tâches

- [x] Ajouter `ModuleFamilySchema`, `ModuleDefinitionSchema`, `ModuleVariantSchema`, `ModuleSlotSchema`.
- [x] Valider les ids stables au format `family.slug`.
- [x] Valider les limites: nombre de slots, variantes, tags et notes.
- [x] Exporter les types depuis `@odc/shared`.
- [x] Ajouter tests fixtures valides et invalides.

### Critère de sortie

Le package partagé peut valider un catalogue de modules sans dépendre du worker ou du frontend.

## Jalon 1 — Catalogue MVP data-only

### Objectif

Ajouter un premier catalogue de modules réutilisables et testés.

### Fichiers cibles

- `packages/shared/src/default-module-catalog.ts`
- `packages/shared/src/default-module-catalog.test.ts`
- `packages/shared/src/index.ts`

### Tâches

- [x] Définir les 6 modules Priorité 1.
- [x] Ajouter 4 variantes structurelles par module.
- [x] Ajouter `intentTags`, `useWhen`, `avoidWhen` et `selectionHeuristics`.
- [x] Ajouter des `promptSignals` par variante.
- [x] Ajouter `shadcnHints.primitives` et `shadcnHints.registryItems` uniquement comme hints.
- [x] Tester que tous les modules passent `ModuleDefinitionSchema`.
- [x] Tester l'unicité des ids module et variant.
- [x] Installer les composants source shadcn/ui de base dans `apps/web` sans en faire une source de vérité produit.

### Critère de sortie

Le catalogue MVP est importable, borné à 4 variantes par module et entièrement validé par tests unitaires.

## Jalon 2 — Sélection bornée de modules

### Objectif

Permettre au worker de sélectionner un petit ensemble de modules candidats à partir du prompt, du device et du mode.

### Fichiers cibles

- `apps/worker/src/modules/selectModules.ts`
- `apps/worker/src/modules/selectModules.test.ts`
- `apps/worker/src/providers/AiProvider.ts`

### Tâches

- [x] Implémenter un score déterministe basé sur `positivePromptSignals`, `negativePromptSignals`, `deviceSupport` et `family`.
- [x] Retourner 3 à 6 modules maximum.
- [x] Forcer de la diversité de familles quand plusieurs modules ont un score proche.
- [x] Sélectionner les variantes depuis leurs `promptSignals` avant le fallback par densité.
- [x] Ajouter tests pour dashboard, settings, auth, pricing et prompt vague.
- [x] Ne pas appeler de modèle IA dans le sélecteur.

### Critère de sortie

Deux prompts proches peuvent recevoir des modules et variantes différents sans hasard opaque.

## Jalon 3 — ScreenPlan et prompt assembly

### Objectif

Introduire un plan intermédiaire pour tracer les modules utilisés par la génération.

### Fichiers cibles

- `packages/shared/src/screen-plan.ts`
- `packages/shared/src/screen-plan.test.ts`
- `apps/worker/src/providers/MockAiProvider.ts`
- `apps/worker/src/jobs/generationJobProcessor.ts`

### Tâches

- [ ] Ajouter `ScreenPlanSchema`.
- [ ] Étendre l'input provider avec `moduleCandidates`.
- [ ] Adapter le mock provider pour produire des compositions différentes selon les modules sélectionnés.
- [ ] Conserver une sortie `DesignSpec` complète et valide.
- [ ] Tester que le pipeline fonctionne sans `ScreenPlan`.

### Critère de sortie

La génération mockée peut varier sa structure depuis les modules tout en produisant un `DesignSpec` validé.

## Jalon 4 — Métadonnées de module dans DesignSpec

### Objectif

Tracer les modules appliqués sans rendre le rendu dépendant de ces métadonnées.

### Fichiers cibles

- `packages/shared/src/design-spec.ts`
- `packages/shared/src/design-spec.test.ts`
- `apps/worker/src/compiler/designSpecToHtml.test.ts`

### Tâches

- [ ] Ajouter `moduleRefs` optionnel au niveau `DesignSpec`.
- [ ] Valider `moduleId`, `variantId`, `appliedToNodeId` et `confidence`.
- [ ] Tester qu'un `DesignSpec` sans `moduleRefs` reste valide.
- [ ] Tester qu'un `DesignSpec` avec refs invalides échoue proprement.
- [ ] Vérifier que le compilateur HTML ignore `moduleRefs`.

### Critère de sortie

Les modules sont traçables pour l'édition et les variantes, mais le rendu reste déterministe depuis l'arbre `root`.

## Jalon 5 — Documentation et garde-fous shadcn

### Objectif

Documenter le rôle exact de shadcn pour éviter une dérive vers JSX comme source de vérité.

### Fichiers cibles

- `docs/05-ai-pipeline.md`
- `docs/08-exports.md`
- `docs/09-security.md`
- `docs/11-roadmap.md`

### Tâches

- [ ] Documenter `prompt -> modules -> ScreenPlan -> DesignSpec -> artifacts`.
- [ ] Documenter que shadcn est une cible d'export React/Tailwind.
- [ ] Ajouter les règles de sécurité: modules data-only, pas de JS, pas de dépendances dynamiques.
- [ ] Ajouter la suite de vérification du plan.

### Critère de sortie

Les docs rendent impossible de confondre module catalog, design system, DesignSpec et shadcn runtime.

## Vérification

```bash
pnpm typecheck
pnpm test:unit
pnpm build
pnpm check:links
```

## Critère de sortie du plan complet

- le catalogue est validé par Zod;
- le worker sélectionne un sous-ensemble borné de modules;
- le provider mock produit des structures différentes selon les modules;
- les `DesignSpec` restent complets, portables et compilables sans module runtime;
- shadcn est préparé comme vocabulaire/export, pas comme source de vérité.
