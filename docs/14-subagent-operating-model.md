# Subagent Operating Model

Date: 2026-06-17

## Objectif

Définir l'organisation des sous-agents de développement pour construire Open Design Canvas de manière fiable, vérifiable et progressive.

Ce document couvre:

- les rôles de sous-agents;
- quand les lancer;
- ce qu'ils produisent;
- comment ils sont reviewés;
- comment ils s'intègrent avec les plans MVP, Eve et MCP.

## Principe central

Un agent principal joue le rôle d'orchestrateur. Il lit les plans, découpe le travail, lance des sous-agents spécialisés sur des tâches bornées, review leurs résultats, demande les corrections nécessaires, puis valide la sortie.

Les sous-agents ne possèdent pas l'architecture produit. Ils exécutent ou auditent une partie définie. Les décisions structurantes restent documentées dans `docs/`, en particulier:

- [Architecture](02-architecture.md)
- [Pipeline IA](05-ai-pipeline.md)
- [Integration Eve](13-eve-agent-framework.md)
- [Plans](plans/)

## Roster des sous-agents

### orchestrator

Mission:

- sélectionner le plan à exécuter;
- découper les tâches;
- lancer les bons sous-agents;
- intégrer mentalement les résultats;
- arbitrer les conflits;
- vérifier que les critères de sortie sont respectés.

Entrées:

- plan d'implémentation;
- état du repo;
- contraintes utilisateur.

Sorties:

- instructions de tâche pour les sous-agents;
- synthèse de progression;
- décision go/no-go après review.

Ne code pas directement sauf pour les corrections de coordination, docs ou petits raccords.

### product-architect

Mission:

- protéger la vision produit et les limites MVP;
- vérifier que chaque tâche renforce la boucle prompt -> preview -> canvas -> version -> export;
- détecter les dérives vers Figma clone, plateforme trop large ou architecture prématurée.

À lancer:

- au début d'une phase;
- avant une décision d'architecture;
- quand deux plans semblent se contredire.

Sortie attendue:

- avis court avec décisions, risques et corrections documentaires.

### frontend-builder

Mission:

- construire l'app React/Vite;
- développer Project Shell, Chat Panel, Canvas Workspace, Preview Panel, Design System Panel;
- appliquer Tailwind/shadcn/Radix/Lucide selon les docs.

À lancer:

- plans `01`, `03`, `05`;
- tâches UI du plan `02`;
- corrections UI issues de QA.

Sortie attendue:

- composants et tests;
- screenshots Playwright quand une UI change;
- résumé des états gérés.

### backend-builder

Mission:

- construire API Node Hono/Fastify;
- implémenter routes projets, screens, jobs, exports;
- maintenir les contrats API et formats d'erreur.

À lancer:

- plans `01`, `02`, `04`, `06`;
- intégration des tools Eve côté backend;
- changements d'auth ou permissions.

Sortie attendue:

- routes validées par Zod;
- tests API;
- mapping clair des erreurs.

### data-modeler

Mission:

- maintenir Drizzle/Postgres;
- définir tables, relations, indexes, migrations;
- protéger la source de vérité `DesignSpec`.

À lancer:

- avant toute table nouvelle;
- plans `01`, `02`, `04`, `05`, `06`;
- quand Eve ou MCP demande une persistance nouvelle.

Sortie attendue:

- schema et migration;
- impacts sur types partagés;
- stratégie d'idempotence si mutation agentique.

### generation-pipeline-builder

Mission:

- implémenter génération, réparation, validation, compilation;
- maintenir abstraction provider;
- garantir que le pipeline produit des `DesignSpec` valides.

À lancer:

- plan `02`;
- avant l'activation Eve dans plan `07`;
- toute évolution de prompt, validation ou critic loop.

Sortie attendue:

- code pipeline;
- tests sur fixtures valides/invalides;
- logs d'erreur exploitables.

### canvas-preview-builder

Mission:

- intégrer canvas infini et preview isolée;
- connecter screenshots, nodes, iframe/Sandpack;
- assurer navigation, sélection, responsive preview.

À lancer:

- plans `02`, `03`;
- toute correction de rendu ou sandbox browser;
- QA visuelle.

Sortie attendue:

- composants canvas/preview;
- tests Playwright;
- notes de sécurité preview si pertinentes.

### eve-agent-runtime-builder

Mission:

- créer `apps/agent-runtime`;
- définir tools, skills, subagents et evals Eve;
- connecter Eve au backend sans déplacer la source de vérité.

À lancer:

- plan `07`;
- après que le pipeline direct fonctionne;
- pour ajouter orchestration agentique, critique ou réparation automatique.

Sortie attendue:

- runtime Eve découvrable par `eve info`;
- tools idempotents;
- evals Eve;
- documentation des env vars.

### mcp-knowledge-builder

Mission:

- créer `packages/mcp-knowledge`;
- exposer docs, schemas, ADRs, plans et playbooks;
- fournir transport compatible Eve et local dev.

À lancer:

- plan `08`;
- avant ou en parallèle du plan `07`;
- quand les agents ont besoin de contexte sans charger tout le repo.

Sortie attendue:

- serveur MCP testé;
- tools read-only;
- redaction et path allow-list;
- connection Eve validée.

### qa-reviewer

Mission:

- vérifier comportement, tests, UX et régressions;
- exécuter ou demander les commandes de vérification;
- contrôler les critères de sortie.

À lancer:

- après chaque tâche substantielle;
- avant de clore une phase;
- après corrections de bug.

Sortie attendue:

- findings ordonnés par sévérité;
- commandes exécutées;
- zones non couvertes.

### security-reviewer

Mission:

- auditer sandbox, auth, generated code, MCP, Eve tools, secrets;
- vérifier que les mutations agentiques sont bornées;
- détecter injection, path traversal, XSS, SSRF, fuite de tokens.

À lancer:

- avant preview/generation production;
- plans `02`, `07`, `08`;
- tout changement auth, sandbox, MCP ou export.

Sortie attendue:

- findings exploitables;
- recommandations minimales;
- blocages release si nécessaire.

### docs-maintainer

Mission:

- maintenir `README`, index, roadmap, plans, ADRs et playbooks;
- vérifier les liens;
- éviter divergence entre code, plans et docs.

À lancer:

- après chaque phase;
- quand un plan change;
- quand une décision d'architecture est prise.

Sortie attendue:

- docs mises à jour;
- liens locaux vérifiés;
- changements résumés.

## Roadmap de lancement des sous-agents

### Phase 0: cadrage et préparation

Plans concernés:

- docs existantes;
- [Plan 7](plans/07-agent-runtime-eve.md);
- [Plan 8](plans/08-knowledge-mcp.md).

Sous-agents:

1. `product-architect`: vérifie le découpage MVP.
2. `docs-maintainer`: maintient index, roadmap et playbooks.
3. `security-reviewer`: relit les frontières Eve/MCP/sandbox.

Critère de sortie:

- les plans sont cohérents;
- les rôles d'agents sont documentés;
- aucun agent n'a de mandat ambigu.

### Phase 1: fondation MVP

Plan:

- [Plan 1: fondation MVP](plans/01-mvp-foundation.md)

Sous-agents:

1. `data-modeler`: schema projets/canvas.
2. `backend-builder`: API projets.
3. `frontend-builder`: app shell et workspace.
4. `qa-reviewer`: smoke test projet -> workspace.
5. `docs-maintainer`: ajustements docs.

Critère de sortie:

- création projet fonctionnelle;
- workspace visible;
- tests de base verts.

### Phase 2: génération et preview

Plan:

- [Plan 2: génération et preview](plans/02-generation-preview.md)

Sous-agents:

1. `data-modeler`: screens, versions, jobs, artifacts.
2. `generation-pipeline-builder`: provider, validation, compilation.
3. `backend-builder`: routes generation jobs.
4. `canvas-preview-builder`: preview iframe/Sandpack.
5. `security-reviewer`: generated HTML + sandbox.
6. `qa-reviewer`: prompt -> preview.

Critère de sortie:

- un prompt génère un `DesignSpec` valide;
- le preview affiche le résultat;
- invalid spec retourne `VALIDATION_ERROR`.

### Phase 3: canvas infini

Plan:

- [Plan 3: canvas infini](plans/03-canvas.md)

Sous-agents:

1. `canvas-preview-builder`: nodes, pan/zoom, sélection.
2. `frontend-builder`: intégration workspace.
3. `backend-builder`: sauvegarde canvas si nécessaire.
4. `qa-reviewer`: screenshot et interaction.

Critère de sortie:

- chaque génération crée un node déplaçable.

### Phase 3.5: fondation produit durable

Plan:

- [Plan 10: fondation produit durable](plans/10-durable-product-foundation.md)

Sous-agents:

1. `data-modeler`: schéma canonique, contraintes et migrations.
2. `backend-builder`: repositories Postgres, queue BullMQ, routes et readiness.
3. `generation-pipeline-builder`: worker asynchrone et transitions de jobs.
4. `canvas-preview-builder`: réhydratation, screenshots et sauvegarde canvas robuste.
5. `security-reviewer`: renderer, secrets, ownership et stockage privé.
6. `qa-reviewer`: migrations, redémarrage, concurrence et E2E.
7. `docs-maintainer`: cohérence architecture, API, data model et roadmap.

Ordre obligatoire:

1. `data-modeler` fige le schéma et les migrations.
2. `backend-builder` implémente les repositories.
3. `generation-pipeline-builder` branche la queue et le worker.
4. frontend, sécurité et QA interviennent sur des contrats stabilisés.

Critère de sortie:

- génération durable après redémarrage;
- `Screen` et `ScreenVersion` persistés;
- artefacts réellement stockés;
- canvas réhydratable;
- aucune dépendance du chemin produit à une `Map` en mémoire.

### Phase 4: versions et variantes

Plan:

- [Plan 4: versions et variantes](plans/04-versions-variants.md)

Sous-agents:

1. `data-modeler`: relations versions/variants.
2. `generation-pipeline-builder`: édition par prompt et variantes.
3. `backend-builder`: routes versions.
4. `frontend-builder`: UI versions/comparaison.
5. `qa-reviewer`: rollback et variantes.

Critère de sortie:

- plusieurs versions/variantes sont sélectionnables et traçables.

### Phase 5: design system

Plan:

- [Plan 5: design system](plans/05-design-system.md)

Sous-agents:

1. `data-modeler`: stockage design systems.
2. `frontend-builder`: panneau `DESIGN.md`.
3. `generation-pipeline-builder`: injection dans prompts.
4. `qa-reviewer`: cohérence entre deux écrans.

Critère de sortie:

- un projet applique un style cohérent à plusieurs générations.

### Phase 6: exports

Plan:

- [Plan 6: exports](plans/06-exports.md)

Sous-agents:

1. `backend-builder`: routes exports.
2. `generation-pipeline-builder`: export HTML/React depuis `DesignSpec`.
3. `frontend-builder`: menu export.
4. `security-reviewer`: contenu exporté et zip.
5. `qa-reviewer`: export ouvrable.

Critère de sortie:

- HTML et React/Tailwind exportables.

### Phase 7A: MCP connaissance

Plan:

- [Plan 8: MCP connaissance](plans/08-knowledge-mcp.md)

Sous-agents:

1. `mcp-knowledge-builder`: serveur MCP.
2. `security-reviewer`: auth, redaction, path traversal.
3. `qa-reviewer`: smoke MCP.
4. `docs-maintainer`: catalogues et playbooks.

Critère de sortie:

- les agents peuvent chercher et lire docs/schemas/playbooks via MCP.

### Phase 7B: runtime agents Eve

Plan:

- [Plan 7: runtime agents Eve](plans/07-agent-runtime-eve.md)

Sous-agents:

1. `eve-agent-runtime-builder`: app Eve, tools, skills, subagents.
2. `backend-builder`: pont API vers Eve.
3. `generation-pipeline-builder`: adaptation pipeline.
4. `mcp-knowledge-builder`: connection `odc_knowledge`.
5. `security-reviewer`: approvals, secrets, sandbox.
6. `qa-reviewer`: evals Eve.

Critère de sortie:

- un job peut être orchestré par Eve et persister une `ScreenVersion` via backend.

### Phase 8: intégrations avancées

Plans futurs:

- Figma;
- import URL/image;
- collaboration;
- partage public.

Sous-agents à décider après stabilisation MVP:

- `integration-builder`;
- `collaboration-builder`;
- `figma-export-builder`.

Critère de démarrage:

- boucle MVP stable;
- exports fonctionnels;
- runtime agentique vérifié.

## Protocole de lancement

Chaque sous-agent reçoit une mission courte avec:

- rôle;
- plan à lire;
- fichiers ciblés;
- contraintes;
- sortie attendue;
- commandes de vérification.

Template:

```text
Role: <subagent>
Read first:
- <docs>

Task:
<one bounded task>

Constraints:
- Keep DesignSpec as source of truth.
- Do not change unrelated files.
- Add tests for changed behavior.

Return:
- Summary
- Files changed
- Tests run
- Risks/open questions
```

## Protocole de review

Après chaque sous-agent:

1. `qa-reviewer` vérifie tests et comportement si la tâche touche du code.
2. `security-reviewer` vérifie si la tâche touche auth, sandbox, MCP, generated code ou exports.
3. `docs-maintainer` vérifie si la tâche change architecture, API, data model ou workflow.
4. `orchestrator` décide: accepter, demander correction, ou redécouper.

## Politique de parallélisation

Paralléliser uniquement quand les tâches n'écrivent pas les mêmes fichiers et ont des contrats clairs.

Bonnes parallélisations:

- frontend shell pendant backend project routes;
- docs/playbooks pendant scaffolding MCP;
- tests/review après une implémentation finie;
- MCP connaissance en parallèle de la préparation Eve, si la surface MCP est figée.

À éviter:

- deux agents modifiant le même schema DB;
- frontend et backend inventant chacun leurs types;
- Eve tools avant stabilisation des contrats backend;
- security review trop tôt, avant d'avoir une surface concrète.

## Journalisation recommandée

Créer `docs/agent-runs/` quand le développement démarre réellement.

Format:

```text
docs/agent-runs/
  2026-06-17-phase-01-foundation.md
  2026-06-17-phase-02-generation-preview.md
```

Chaque journal contient:

- sous-agents lancés;
- tâches;
- décisions;
- tests;
- risques restants.

## Gestion des skills

Les skills utiles doivent rester courts et orientés procédure.

Sources:

- skills Codex installés localement;
- skills projet dans `docs/agent-playbooks/`;
- skills Eve dans `apps/agent-runtime/agent/skills/` quand le runtime existe.

Règles:

- vérifier la source avant d'installer un skill externe;
- lire le contenu avant usage;
- ne pas installer de skill qui exécute des scripts non audités;
- préférer un playbook Markdown projet quand le besoin est spécifique à Open Design Canvas.

