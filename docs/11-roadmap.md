# Roadmap

## Stratégie

Construire en couches. Chaque phase doit produire un logiciel testable et utilisable, même limité.

## Point de situation — 2026-06-18

Les Phases 1 à 3 sont partiellement implémentées et valident le parcours projet -> génération mockée -> preview -> canvas. Avant de poursuivre les versions et variantes, le coeur doit être consolidé pour devenir une fondation produit durable.

Documents de pilotage:

- [Audit de préparation produit](16-production-readiness-audit.md)
- [Plan 10: fondation produit durable](plans/10-durable-product-foundation.md)
- [Plan 11: bibliothèque de modules UI](plans/11-ui-module-library.md)

La priorité courante est la persistance canonique de `Screen` et `ScreenVersion`, la queue BullMQ, les workers séparés, le stockage réel des artefacts et la réhydratation complète du workspace.

## Phase 0: cadrage

Livrables:

- documentation produit;
- architecture;
- modèle de données;
- choix canvas et preview;
- plans d'implémentation;
- organisation des sous-agents de developpement.

Statut: documenté.

Voir:

- [Organisation des sous-agents](14-subagent-operating-model.md)
- [Plan 9: organisation des sous-agents](plans/09-subagent-development-organization.md)

## Phase 1: fondation MVP

Objectif:

Créer une application web locale avec projets, stockage et layout principal.

Livrables:

- app React/Vite;
- backend Node;
- Postgres local;
- création/liste de projets;
- layout chat/canvas/preview;
- tests de base.

Critère de sortie:

Un utilisateur peut créer un projet et ouvrir un workspace vide.

## Phase 2: génération et preview

Objectif:

Transformer un prompt en écran HTML/React affichable.

Livrables:

- provider IA abstrait;
- génération DesignSpec;
- validation Zod;
- compilation HTML;
- preview iframe/Sandpack;
- capture erreurs.

Critère de sortie:

Un prompt génère un écran visible dans la preview.

## Phase 3: canvas infini

Objectif:

Organiser les écrans générés sur un canvas.

Livrables:

- intégration Excalidraw;
- ScreenNode;
- screenshot preview;
- sauvegarde positions;
- sélection écran.

Critère de sortie:

Chaque génération crée un node déplaçable sur le canvas.

## Phase 3.5: fondation produit durable

Statut: implémentée et validée end-to-end (2026-06-25) sur la branche `codex/generation-persistence-queue`. Typecheck propre, 93 tests unitaires verts, suite e2e Playwright 3/3 incluant la boucle de génération complète et la réhydratation canvas après rechargement. Screenshots réellement stockés (MinIO), screens/versions persistés en Postgres. Reste: livraison (commit/PR) et durcissement auth (hors MVP).

Objectif:

Transformer la boucle locale existante en pipeline persistant, asynchrone, récupérable et sécurisé.

Livrables:

- infrastructure locale Postgres, Redis et stockage S3-compatible;
- migrations Drizzle reproductibles;
- modèle canonique `Screen` / `ScreenVersion` / `Artifact`;
- node canvas pointant vers `Screen`;
- jobs BullMQ exécutés par un worker séparé;
- stockage réel des screenshots;
- routes de lecture et réhydratation après rechargement;
- sauvegarde canvas avec révision et contrôle de concurrence;
- fondations auth, ownership et observabilité.

Plan:

- [Plan 10: fondation produit durable](plans/10-durable-product-foundation.md)

Critère de sortie:

Une génération et sa preview restent entièrement récupérables après redémarrage, et le backend possède durablement tous les objets produit.

## Phase 4: versions et variantes

Statut (2026-06-25): 4/5 livrables faits sur `codex/generation-persistence-queue`. Reste `generate_variants` (variantes parallèles), encore rejeté par le processor.

Objectif:

Permettre l'itération réelle.

Livrables:

- ScreenVersion ✅;
- édition par prompt ✅ (job `edit_screen` end-to-end + mode édition dans le chat);
- retour version précédente ✅ (`PUT /api/screens/:id/current-version` + panneau VersionHistory);
- variantes parallèles ⏳ (`generate_variants` à implémenter);
- comparaison screenshots ✅ (comparaison côte à côte dans VersionHistory).

Critère de sortie:

Un écran peut avoir plusieurs versions et variantes sélectionnables.

## Phase 4.5: bibliothèque de modules UI

Objectif:

Diversifier les générations avec un catalogue de modules UI validé, DesignSpec-first et compatible shadcn pour les futurs exports React/Tailwind.

Livrables:

- contrats Zod `ModuleDefinition`, `ModuleVariant`, `ModuleSlot`;
- catalogue MVP data-only pour dashboards, tables, forms, auth, pricing, settings et feedback;
- sélection déterministe de modules candidats par prompt et device;
- `ScreenPlan` intermédiaire pour tracer les choix de composition;
- métadonnées optionnelles `moduleRefs` dans `DesignSpec`;
- règles documentées empêchant shadcn ou JSX de devenir la source canonique.

Plan:

- [Plan 11: bibliothèque de modules UI](plans/11-ui-module-library.md)

Critère de sortie:

Deux prompts proches peuvent produire des structures `DesignSpec` différentes, traçables et compilables sans dépendre de React ou de shadcn au runtime.

## Phase 5: design system

Objectif:

Stabiliser la direction visuelle.

Livrables:

- DESIGN.md;
- parser tokens;
- panneau d'édition;
- injection dans les prompts;
- régénération avec design system.

Critère de sortie:

Deux écrans générés dans un même projet partagent des règles de style cohérentes.

## Phase 6: exports

Objectif:

Sortir du produit avec des artefacts utiles.

Livrables:

- export HTML autonome;
- export React/Tailwind;
- zip téléchargeable;
- README d'intégration.

Critère de sortie:

Un écran peut être téléchargé et lancé dans un projet Vite neuf.

## Phase 7: V2 agentique

Objectif:

Ajouter le runtime agentique Eve et le MCP de connaissance interne sans déplacer la source de vérité produit.

Livrables:

- app `agent-runtime` Eve;
- tools idempotents vers le backend;
- subagents planner, generator, critic et exporter;
- skills de génération, critique et export;
- MCP docs/schemas/playbooks;
- evals Eve de génération et réparation;
- critique visuelle multimodale;
- réparation automatique;

Critère de sortie:

Un job de génération peut être orchestré par Eve, validé par les tools backend, enrichi par le MCP et persisté en `ScreenVersion`.

## Phase 8: intégrations design

Objectif:

Connecter le produit aux workflows design.

Livrables:

- plugin Figma;
- export PDF;
- export PPTX;
- partage public sécurisé;
- collaboration temps réel.

## Ordre recommandé

1. Consolider la Phase 3.5 avec le Plan 10.
2. Phase 4: versions et variantes.
3. Phase 4.5: bibliothèque de modules UI.
4. Phase 5: design system.
5. Phase 6: exports.
6. Phase 7A: MCP connaissance.
7. Phase 7B: runtime agentique Eve.
8. Phase 8: intégrations avancées.

Les Phases 1 à 3 restent la base fonctionnelle, mais leur consolidation durable est désormais le chemin critique. Ne pas démarrer Figma, collaboration temps réel ou import codebase avant d'avoir une boucle stable prompt vers preview vers canvas. Ne pas déplacer la source de vérité produit dans Eve: le runtime agentique doit rester derrière les contrats backend.
