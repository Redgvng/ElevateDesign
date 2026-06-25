# Index Documentaire

Date: 2026-06-18

## Objectif

Cette documentation sert de base pour construire Open Design Canvas, un outil open source de génération et d'itération UI dans le navigateur.

Le produit vise une première version utilisable avant toute ambition de plateforme complète. Le périmètre prioritaire est:

1. créer un projet;
2. générer un écran depuis un prompt;
3. prévisualiser le rendu;
4. déposer l'écran sur un canvas;
5. itérer par prompt;
6. exporter le résultat.

## Documents

### Cadrage

- [01-product-spec.md](01-product-spec.md): vision produit, utilisateurs, fonctionnalités et hors scope.
- [02-architecture.md](02-architecture.md): architecture logique, services et flux.
- [03-tech-stack.md](03-tech-stack.md): stack recommandée et alternatives.

### Technique

- [04-data-model.md](04-data-model.md): modèle de données.
- [05-ai-pipeline.md](05-ai-pipeline.md): pipeline de génération, validation et critique.
- [15-ai-providers.md](15-ai-providers.md): integration des SDKs OpenAI et Anthropic derriere l'abstraction provider.
- [16-production-readiness-audit.md](16-production-readiness-audit.md): audit du code courant face à la cible produit et priorités de consolidation.
- [06-canvas-and-preview.md](06-canvas-and-preview.md): canvas infini, preview, sandbox et screenshots.
- [07-design-system.md](07-design-system.md): format DESIGN.md et tokens.
- [08-exports.md](08-exports.md): exports HTML, React, Figma et autres formats.
- [09-security.md](09-security.md): sécurité du runtime et des contenus générés.
- [10-api-contracts.md](10-api-contracts.md): contrats API internes.
- [13-eve-agent-framework.md](13-eve-agent-framework.md): integration Eve, architecture agents et futur MCP interne.
- [14-subagent-operating-model.md](14-subagent-operating-model.md): organisation des sous-agents de developpement.

### Roadmap et exécution

- [11-roadmap.md](11-roadmap.md): phases de construction.
- [12-estimates-with-agents.md](12-estimates-with-agents.md): estimation avec Codex et Claude Code.
- [plans/](plans/): plans d'implémentation.
  - [plans/07-agent-runtime-eve.md](plans/07-agent-runtime-eve.md): runtime agentique Eve.
  - [plans/08-knowledge-mcp.md](plans/08-knowledge-mcp.md): MCP interne docs, schemas et playbooks.
  - [plans/09-subagent-development-organization.md](plans/09-subagent-development-organization.md): organisation et roadmap des sous-agents.
  - [plans/10-durable-product-foundation.md](plans/10-durable-product-foundation.md): fondation durable Postgres, queue, workers, artefacts, réhydratation et sécurité.
  - [plans/11-ui-module-library.md](plans/11-ui-module-library.md): catalogue de modules UI DesignSpec-first et compatibilité shadcn pour diversifier les générations.

### Références et décisions

- [../AGENTS.md](../AGENTS.md): guide racine pour les agents travaillant dans ce repo.
- [agent-playbooks/](agent-playbooks/): playbooks de roles pour sous-agents.
- [reference/open-source-alternatives.md](reference/open-source-alternatives.md): alternatives open source par brique.
- [adr/0001-canvas-choice.md](adr/0001-canvas-choice.md): choix du canvas.
- [adr/0002-preview-sandbox.md](adr/0002-preview-sandbox.md): choix du runtime de preview.

## Principe directeur

Le produit doit stocker une représentation structurée des interfaces, pas seulement du HTML. Le HTML et le React sont des sorties générées. La source de vérité doit rester un modèle de design versionné et portable.
