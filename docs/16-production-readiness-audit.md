# Audit de préparation produit

Date: 2026-06-18

## Objectif

Ce document photographie l'état réel d'Open Design Canvas après l'implémentation des premières briques projet, génération, preview et canvas.

Le produit reste un MVP, mais il doit être construit comme la première version d'un produit durable, et non comme une démonstration jetable. L'audit privilégie donc les choix qui évitent une réécriture du coeur produit lorsque les vrais providers IA, les versions, les variantes, les exports et plusieurs utilisateurs seront ajoutés.

## Documents de référence pris en compte

L'analyse est alignée sur:

- [Spec produit](01-product-spec.md);
- [Architecture](02-architecture.md);
- [Stack technique](03-tech-stack.md);
- [Modèle de données](04-data-model.md);
- [Pipeline IA](05-ai-pipeline.md);
- [Canvas et preview](06-canvas-and-preview.md);
- [Sécurité](09-security.md);
- [Contrats API](10-api-contracts.md);
- [Roadmap](11-roadmap.md);
- [Organisation des sous-agents](14-subagent-operating-model.md);
- [Providers IA](15-ai-providers.md);
- plans d'implémentation existants dans `docs/plans/`.

En cas d'écart entre le code courant et ces documents, le modèle produit documenté reste la cible, sauf décision d'architecture explicite ultérieure.

## Verdict

Le dépôt possède une base technique saine:

- monorepo TypeScript lisible;
- séparation `web`, `api`, `worker`, `shared` et `db`;
- `DesignSpec` comme source de vérité;
- contrats Zod partagés;
- création de projet, génération mockée, preview et canvas fonctionnels;
- schéma Drizzle amorcé pour les objets principaux;
- tests unitaires sur les principaux chemins heureux.

Le flux réel reste toutefois une application locale à processus unique:

```text
Web -> API -> Mock provider -> Chromium -> réponse HTTP
```

La cible produit décrite dans l'architecture et la stack est:

```text
Web -> API -> Postgres + Redis/BullMQ
                    |
                    v
                  Worker -> Provider IA
                         -> Validation DesignSpec
                         -> Compilation déterministe
                         -> Renderer isolé
                         -> Object storage
                         -> Postgres
```

La priorité n'est donc pas d'ajouter immédiatement plus d'interface. Il faut rendre durable la boucle déjà visible: prompt -> job -> Screen -> ScreenVersion -> artefacts -> canvas -> preview réhydratée.

## État des phases existantes

### Phase 1: fondation MVP

État: largement implémentée.

Présent:

- application React/Vite;
- API Hono;
- projets;
- canvas par projet;
- workspace chat/canvas/preview;
- tests de base.

À consolider:

- migrations Drizzle reproductibles;
- configuration locale complète;
- persistance obligatoire en environnement produit;
- ownership utilisateur ou workspace.

### Phase 2: génération et preview

État: prototype fonctionnel, architecture cible non terminée.

Présent:

- schémas `DesignSpec` et génération;
- provider mock déterministe;
- compilation HTML;
- rendu Playwright;
- preview iframe;
- routes de jobs.

Manquant par rapport au plan et aux docs:

- vraie queue BullMQ/Redis;
- worker séparé;
- persistance des jobs, écrans et versions;
- stockage des artefacts;
- sélection de provider;
- adaptateurs OpenAI et Anthropic;
- réparation de sortie invalide;
- capture et stockage des erreurs runtime;
- reprise après panne.

### Phase 3: canvas

État: interaction principale présente, modèle à réaligner.

Présent:

- Excalidraw;
- déplacement et viewport;
- persistance du document;
- ajout d'un node après génération;
- sélection d'un node dans la session courante.

Manquant ou incorrect:

- screenshot réellement affiché dans le node;
- réhydratation d'une version après rechargement;
- contrôle de concurrence des sauvegardes;
- révision optimiste du canvas;
- validation métier des nodes et edges;
- alignement avec le modèle de données canonique.

## Écarts structurants

### 1. Le canvas pointe vers la mauvaise entité

Le document [Modèle de données](04-data-model.md) impose:

- un `CanvasNode` de type `screen` pointe vers un `Screen`;
- le `Screen` pointe vers sa version courante;
- les exports pointent directement vers une `ScreenVersion`.

Le code courant ajoute un `versionId` au node canvas et construit son identité à partir du couple screen/version.

Cette implémentation rend chaque version équivalente à un nouveau node. Elle compliquerait:

- le changement de version courante;
- le rollback;
- la comparaison de versions;
- l'édition d'un écran existant;
- les variantes parallèles;
- le maintien de la position d'un écran lorsque sa version change.

**Décision recommandée:** réaligner immédiatement le canvas sur `Screen.refId`. Le node conserve éventuellement un `pinnedVersionId` optionnel uniquement si le produit veut permettre d'épingler une version historique sur le canvas.

### 2. Les générations ne sont pas persistées

Les projets et canvas peuvent utiliser Postgres, mais les jobs, écrans et versions sont stockés dans une `Map` en mémoire.

Après redémarrage:

- le job n'existe plus;
- la version n'existe plus;
- le HTML n'existe plus;
- la preview ne peut pas être reconstruite;
- le node canvas devient une référence orpheline.

Cela contredit directement les contraintes produit suivantes:

- données versionnées;
- exports reproductibles depuis les données stockées;
- même écran récupérable et modifiable plus tard.

### 3. Les artefacts sont fictifs

Playwright produit un buffer PNG, mais celui-ci n'est pas écrit dans un stockage. L'application génère seulement un identifiant `artifact_*`.

Cela empêche:

- l'affichage réel du screenshot sur le canvas;
- la comparaison visuelle de versions;
- les exports reproductibles;
- la critique multimodale;
- le partage d'un rendu.

### 4. Le job asynchrone est actuellement synchrone

La route `POST /generation-jobs` attend le provider, la validation, la compilation et Chromium avant de répondre.

Le polling frontend existe, mais le premier appel retourne déjà un état terminal dans le chemin normal.

Ce comportement ne peut pas supporter proprement:

- un vrai provider IA;
- plusieurs générations simultanées;
- une réparation automatique;
- le mode qualité;
- les variantes batch;
- l'orchestration Eve;
- une reprise après panne.

### 5. Le backend produit ne possède pas encore tous ses objets

L'architecture précise que le backend possède:

- projets;
- jobs;
- screens;
- versions;
- artefacts;
- auth;
- persistance.

Le code crée aujourd'hui `Screen` et `ScreenVersion` à l'intérieur d'un store de génération en mémoire, sans routes de domaine dédiées ni repository persistant.

Avant d'ajouter Eve, ces contrats backend doivent être stabilisés. Eve devra appeler des tools vers le backend, pas inventer ni conserver les objets produit.

### 6. Sauvegarde canvas vulnérable aux réponses désordonnées

Chaque changement Excalidraw déclenche un `PUT` complet. Plusieurs requêtes peuvent être actives en parallèle et une ancienne réponse peut réinstaller un état obsolète.

Pour un produit concret, il faut:

- debounce;
- sérialisation des sauvegardes;
- numéro de révision;
- réponse `409 CONFLICT` en cas de version obsolète;
- tests de concurrence.

### 7. Le renderer n'est pas encore isolé comme prévu

Le renderer Playwright ne bloque pas le réseau et ne limite pas les ressources externes. Le risque immédiat reste limité tant que le compilateur génère un HTML contrôlé, mais l'ajout d'assets, de custom nodes ou de code importé rendra ce point critique.

La cible doit inclure:

- blocage réseau par défaut;
- allowlist explicite si nécessaire;
- timeouts globaux;
- limites CPU/mémoire du worker;
- aucune clé IA dans l'environnement du renderer;
- stockage des logs et erreurs de rendu.

### 8. Authentification et ownership absents

Les routes ne contrôlent ni utilisateur ni workspace. Ce point n'empêche pas le développement local, mais bloque une bêta publique réelle.

Le schéma doit devenir tenant-ready avant que les données se multiplient. Les tables principales doivent être rattachées à un workspace, directement ou par relation.

### 9. Contrats et limites incomplets

Le canvas accepte des collections et champs sans limites métier suffisantes. Les edges ne sont pas vérifiées contre les nodes existants. Les références screen/version/artifact ne sont pas vérifiées.

Le `DesignSpec` devra également recevoir des limites de profondeur, de nombre de nodes, de taille de contenu et d'assets avant l'utilisation de vrais providers.

### 10. Schéma DB présent sans chaîne de migrations

Les tables Drizzle existent en TypeScript, mais le dépôt ne contient pas encore:

- configuration Drizzle;
- migrations SQL versionnées;
- commande `db:generate`;
- commande `db:migrate`;
- environnement local Postgres/Redis/object storage reproductible.

Un schéma sans migrations n'est pas encore une persistance exploitable.

## Analyse des routes

### Routes implémentées

| Méthode | Route | Diagnostic |
|---|---|---|
| `GET` | `/health` | liveness minimale seulement |
| `POST` | `/api/projects` | validation et idempotence présentes |
| `GET` | `/api/projects` | pas de pagination ni ownership |
| `GET` | `/api/projects/:projectId` | pas d'authorization |
| `GET` | `/api/projects/:projectId/canvas` | lecture complète |
| `PUT` | `/api/projects/:projectId/canvas` | remplacement complet sans révision |
| `POST` | `/api/projects/:projectId/generation-jobs` | exécution synchrone et mémoire |
| `GET` | `/api/generation-jobs/:jobId` | mémoire du processus uniquement |

### Routes prioritaires manquantes

Pour terminer la boucle produit avant versions avancées:

- `GET /api/projects/:projectId/screens`
- `GET /api/screens/:screenId`
- `GET /api/screens/:screenId/versions`
- `GET /api/screen-versions/:screenVersionId`
- `POST /api/screens/:screenId/current-version`
- `GET /api/artifacts/:artifactId`

### Contrats de génération à stabiliser

La création d'un job doit répondre rapidement avec `202 Accepted` et un job `queued`.

Le worker doit être le seul composant à effectuer les transitions:

```text
queued -> running -> completed
                  -> failed
                  -> cancelled
```

Les transitions doivent être persistées et idempotentes.

## Sécurité et exploitation

### Avant utilisation de vrais providers

- validation de configuration au démarrage;
- secrets uniquement côté worker;
- redaction des prompts contenant des credentials;
- limites de prompt et de `DesignSpec`;
- mapping d'erreurs provider stable;
- retry borné avec backoff;
- aucun raw provider exposé au client.

### Avant bêta publique

- auth;
- ownership workspace;
- rate limiting;
- quotas de génération;
- audit logs minimaux;
- object storage privé avec URLs signées;
- CORS configurable;
- health et readiness séparés;
- observabilité jobs/provider/renderer;
- isolation réseau du renderer.

## Vérifications effectuées

Les vérifications suivantes ont réussi:

- typecheck de `@odc/shared`;
- typecheck de `@odc/db`;
- typecheck de `@odc/worker`;
- typecheck de `@odc/api`;
- typecheck de `@odc/web`;
- 23 tests unitaires réussis sur 23.

Les tests Playwright E2E et le build global n'ont pas pu être relancés pendant l'audit à cause d'erreurs d'infrastructure du connecteur de développement. Ils ne sont donc pas considérés comme vérifiés dans ce document.

## Tests manquants prioritaires

- persistance d'un job après redémarrage;
- récupération d'une preview après rechargement navigateur;
- deux sauvegardes canvas dont les réponses arrivent dans le désordre;
- conflit de révision canvas;
- panne provider et retry;
- panne renderer distincte d'une panne provider;
- tentative réseau depuis le renderer;
- génération simultanée de plusieurs jobs;
- cohérence transactionnelle Screen/ScreenVersion/job;
- accès cross-workspace refusé;
- clé d'idempotence réutilisée avec un payload différent;
- migration depuis une base vide.

## Conclusion

Le code actuel valide la direction produit, mais il faut maintenant consolider le coeur de domaine avant de poursuivre les fonctionnalités visibles.

La première tranche doit rendre vraie cette promesse:

> Une génération produit un écran et une version persistés, un screenshot réellement stocké, un node canvas stable pointant vers l'écran, et une preview récupérable après redémarrage.

Le plan associé est décrit dans [Plan 10: fondation produit durable](plans/10-durable-product-foundation.md).
