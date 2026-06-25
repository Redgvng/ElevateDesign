# Durable Product Foundation Implementation Plan

> **Statut (2026-06-25): Jalons 0 à 5 implémentés et validés end-to-end** sur la branche `codex/generation-persistence-queue`. Boucle `prompt -> job -> Screen -> ScreenVersion -> artefacts -> canvas -> preview` durable et récupérable: infra docker (Postgres/Redis/MinIO) + migrations reproductibles, jobs BullMQ exécutés par un worker séparé avec leases/heartbeat/reconciler, persistance transactionnelle idempotente, stockage réel des screenshots (S3/MinIO), sauvegarde canvas avec révision et contrôle de concurrence optimiste (409). Validation: typecheck propre, 93 tests unitaires verts, e2e Playwright 3/3. Restent hors MVP: auth/ownership et observabilité avancée.

> Ce plan consolide les Phases 1 à 3 avant de démarrer les versions, variantes, design systems et exports. Il transforme le prototype local en première fondation d'un produit exploitable.

**Goal:** rendre la boucle `prompt -> job -> Screen -> ScreenVersion -> artefacts -> canvas -> preview` durable, asynchrone, récupérable et sécurisée.

**Architecture:** Postgres reste la source de vérité produit. Redis/BullMQ transporte les travaux asynchrones. Le worker appelle les providers, valide `DesignSpec`, compile les sorties et pilote un renderer isolé. Les screenshots et bundles sont stockés derrière une interface S3-compatible. Le frontend ne dépend d'aucun objet conservé uniquement en mémoire.

**Documents à lire avant implémentation:**

1. `docs/01-product-spec.md`
2. `docs/02-architecture.md`
3. `docs/03-tech-stack.md`
4. `docs/04-data-model.md`
5. `docs/05-ai-pipeline.md`
6. `docs/06-canvas-and-preview.md`
7. `docs/09-security.md`
8. `docs/10-api-contracts.md`
9. `docs/15-ai-providers.md`
10. `docs/16-production-readiness-audit.md`

## Principes non négociables

- `DesignSpec` reste la source de vérité d'un écran.
- Postgres possède les projets, jobs, screens, versions, artefacts, canvas et droits.
- BullMQ transporte les tâches mais n'est pas la source de vérité du statut produit.
- Un node canvas de type `screen` pointe vers un `Screen`, pas vers sa version courante.
- Toute génération ou édition crée une `ScreenVersion` immuable.
- Le même `DesignSpec` produit les mêmes sorties compilées, hors ids et timestamps d'artefacts.
- Le renderer traite tout contenu généré comme non fiable.
- Aucun provider, worker ou agent ne mute les données produit sans passer par les repositories/services backend définis.
- Chaque jalon doit migrer proprement une base vide, passer les tests et laisser le produit exécutable.

## Résultat attendu

Après ce plan:

1. un utilisateur crée un projet persistant;
2. un prompt crée immédiatement un job `queued`;
3. un worker récupère le job et exécute la génération;
4. le résultat valide est persisté sous forme de `Screen` et `ScreenVersion`;
5. le screenshot est réellement stocké;
6. le canvas référence le `Screen` stable;
7. la preview est récupérable après rechargement et redémarrage;
8. les sauvegardes canvas concurrentes ne peuvent plus écraser silencieusement un état récent;
9. le système est prêt à recevoir OpenAI, Anthropic, les éditions, variantes et Eve sans changer ses frontières principales.

---

## Jalon 0 — Infrastructure locale reproductible

### Objectif

Permettre à tout développeur ou agent de démarrer les dépendances produit avec une configuration connue.

### Fichiers cibles

- créer `compose.yaml`;
- créer `.env.example`;
- créer `drizzle.config.ts`;
- créer `packages/db/migrations/`;
- modifier les scripts racine et packages;
- créer un module de configuration validé par Zod.

### Services locaux

- PostgreSQL;
- Redis;
- MinIO ou autre serveur S3-compatible;
- API;
- worker;
- web lancé séparément ou via profil compose de développement.

### Variables minimales

```bash
NODE_ENV=development
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
OBJECT_STORAGE_ENDPOINT=http://...
OBJECT_STORAGE_REGION=auto
OBJECT_STORAGE_BUCKET=odc-artifacts
OBJECT_STORAGE_ACCESS_KEY=...
OBJECT_STORAGE_SECRET_KEY=...
OBJECT_STORAGE_FORCE_PATH_STYLE=true
AI_PROVIDER=mock
```

### Tâches

- [x] Ajouter une validation de configuration au démarrage.
- [x] Refuser le fallback mémoire implicite en production.
- [x] Ajouter `db:migrate`, `infra:up` et `infra:down`.
- [ ] Ajouter `db:generate` et `db:studio`.
- [x] Générer une première migration à partir du schéma canonique.
- [x] Ajouter une commande qui crée le bucket local si nécessaire.
- [x] Séparer `/health/live` et `/health/ready`.
- [x] Vérifier dans readiness la base, Redis et le stockage objet.

### Critère de sortie

Une base vide peut être créée, migrée et utilisée sans étape manuelle non documentée.

---

## Jalon 1 — Modèle de domaine canonique et repositories

### Objectif

Stabiliser les entités qui seront utilisées par toutes les phases suivantes.

### Modèle cible

```text
Workspace
  -> Project
      -> CanvasDocument
      -> Screen
          -> ScreenVersion
              -> Artifact
      -> GenerationJob
```

Préparer également:

```text
User -> WorkspaceMembership -> Workspace
```

Même si l'écran de connexion arrive plus tard, les données doivent être tenant-ready avant leur multiplication.

### Changements de schéma

#### Projects

- ajouter `workspaceId`;
- indexer `(workspaceId, updatedAt)`;
- rendre le slug unique dans un workspace, pas globalement.

#### Screens

- relation forte vers Project;
- `currentVersionId` avec contrainte cohérente;
- index `(projectId, updatedAt)`;
- `title`, `deviceType`, timestamps.

#### ScreenVersions

- immuables;
- contrainte unique `(screenId, versionNumber)`;
- FK `parentVersionId`;
- `operation` contrainte;
- `designSpec`, `htmlCode`, `reactCode`;
- métadonnées provider et modèle utiles pour traçabilité.

#### GenerationJobs

Ajouter au minimum:

- `status`;
- `attemptCount`;
- `maxAttempts`;
- `provider`;
- `model`;
- `startedAt`;
- `completedAt`;
- `cancelledAt`;
- `result`;
- `error` structurée;
- `idempotencyKey` optionnelle;
- timestamps.

#### Artifacts

Ajouter:

- FK réelle vers `ScreenVersion` si applicable;
- `storageKey` unique;
- `checksum`;
- `byteSize`;
- `mimeType`;
- `width` et `height` pour les images;
- metadata JSON bornée.

#### CanvasDocuments

Ajouter:

- `revision` entier positif;
- `updatedBy` quand l'auth sera active;
- `document` validé à la lecture et à l'écriture.

### Règle CanvasNode

Pour un node `screen`:

```ts
{
  type: "screen",
  refId: screenId,
  pinnedVersionId?: string | null
}
```

- `refId` désigne toujours le `Screen`;
- l'absence de `pinnedVersionId` signifie: afficher `currentVersionId`;
- une version historique n'est épinglée que par décision explicite du produit.

### Repositories attendus

- `ProjectRepository`;
- `CanvasRepository`;
- `ScreenRepository`;
- `GenerationJobRepository`;
- `ArtifactRepository`;
- `WorkspaceRepository`;
- `UnitOfWork` ou transactions explicites pour les créations multi-entités.

### Tâches

- [x] Mettre à jour les schémas partagés.
- [x] Corriger le modèle canvas Screen/Version.
- [x] Ajouter les contraintes, FK et index SQL.
- [x] Implémenter les repositories Postgres.
- [x] Supprimer les stores mémoire du chemin produit normal.
- [x] Garder des fakes injectables uniquement pour tests unitaires.
- [ ] Ajouter des tests d'intégration Postgres automatisés.
- [ ] Ajouter un test automatisé de migration depuis une base vide.

### Critère de sortie

Aucun objet métier nécessaire à la preview ne dépend d'une `Map` en mémoire.

---

## Jalon 2 — Pipeline de jobs réellement asynchrone

### Objectif

Découpler la requête HTTP de la génération et rendre les traitements reprenables.

### API

`POST /api/projects/:projectId/generation-jobs` doit:

1. authentifier et autoriser;
2. valider le payload;
3. créer un job `queued` en base;
4. publier un message BullMQ avec `jobId` comme identifiant stable;
5. retourner `202 Accepted`.

### Worker

Le worker doit:

1. charger le job depuis Postgres;
2. acquérir son exécution de façon idempotente;
3. passer le statut à `running`;
4. choisir le provider;
5. produire et réparer le `DesignSpec`;
6. compiler les sorties;
7. rendre le screenshot;
8. persister Screen, ScreenVersion et artefacts dans une transaction cohérente;
9. passer le job à `completed`;
10. enregistrer une erreur typée et passer à `failed` après les retries autorisés.

### Fiabilité

- utiliser `generationJob.id` comme `BullMQ jobId`;
- rendre le handler idempotent;
- ajouter un reconciler périodique qui republie les jobs `queued` absents de Redis;
- ne jamais déduire le statut produit uniquement depuis Redis;
- utiliser retry avec backoff seulement pour les erreurs transitoires;
- ne pas retry automatiquement une erreur de validation définitive;
- préparer l'annulation avec état `cancelled`.

### Codes d'erreur

- `PROVIDER_ERROR`;
- `PROVIDER_TIMEOUT`;
- `PROVIDER_RATE_LIMIT`;
- `INVALID_PROVIDER_OUTPUT`;
- `VALIDATION_ERROR`;
- `COMPILATION_ERROR`;
- `RENDER_ERROR`;
- `STORAGE_ERROR`;
- `CANCELLED`.

### Tâches

- [x] Ajouter BullMQ et la connexion Redis partagée.
- [x] Transformer l'app worker en vrai process consommateur.
- [x] Déplacer toute génération hors de l'API.
- [x] Implémenter les transitions de statut persistées.
- [x] Rendre les retries BullMQ réellement réexécutables côté état PostgreSQL.
- [x] Ajouter un reconciler pour republier les jobs `queued` absents de Redis.
- [x] Ajouter un endpoint d'annulation et retirer le job BullMQ en attente en best-effort.
- [x] Rendre la completion transactionnelle idempotente contre les doubles livraisons.
- [ ] Ajouter des tests automatisés de redémarrage.
- [ ] Vérifier plusieurs jobs parallèles.

### Critère de sortie

L'API peut redémarrer pendant une génération sans perdre le job ni son résultat final.

---

## Jalon 3 — Providers et réparation structurée

### Objectif

Rendre réelle l'abstraction provider décrite dans `docs/15-ai-providers.md`.

### Fichiers cibles

- `apps/worker/src/providers/createAiProvider.ts`;
- `apps/worker/src/providers/OpenAiProvider.ts`;
- `apps/worker/src/providers/AnthropicProvider.ts`;
- prompts et parseurs partagés;
- fixtures provider.

### Tâches

- [ ] Étendre `GenerateDesignOutput` avec provider et modèle.
- [ ] Implémenter la factory provider.
- [ ] Implémenter OpenAI derrière le SDK officiel.
- [ ] Implémenter Anthropic derrière le SDK officiel.
- [ ] Conserver mock comme provider déterministe de test.
- [ ] Ajouter validation JSON, Zod et limites de complexité.
- [ ] Implémenter au maximum deux réparations automatiques.
- [ ] Ne jamais exposer la réponse brute au frontend.
- [ ] Ajouter des fixtures OpenAI et Anthropic.
- [ ] Ajouter des tests d'intégration optionnels derrière variables d'environnement.

### Critère de sortie

Le même job peut être exécuté avec `mock`, `openai` ou `anthropic` sans changer les routes ni les objets produit.

---

## Jalon 4 — Stockage réel des artefacts

### Objectif

Rendre chaque screenshot, bundle et log durable et récupérable.

### Interface

```ts
interface ArtifactStore {
  put(input: PutArtifactInput): Promise<StoredArtifact>;
  get(artifact: Artifact): Promise<ReadableStream | Buffer>;
  delete(artifact: Artifact): Promise<void>;
  createSignedReadUrl?(artifact: Artifact, ttlSeconds: number): Promise<string>;
}
```

### Implémentations

- S3-compatible pour le produit et MinIO local;
- fake mémoire seulement pour tests unitaires ciblés.

### Tâches

- [x] Stocker réellement les bytes screenshot.
- [x] Calculer checksum et taille.
- [x] Persister l'Artifact après upload réussi.
- [x] Nettoyer l'objet si la transaction DB finale échoue.
- [x] Ajouter `GET /api/artifacts/:artifactId` et `GET /api/artifacts/:artifactId/content`.
- [x] Ajouter politiques de cache immuable, ETag, disposition et `nosniff` adaptées.
- [x] Préparer les types `html`, `reactZip`, `log`.
- [ ] Ajouter les tests automatisés de lecture d'objet et d'URL signée.
- [x] Tester upload, suppression et erreurs du stockage; valider un upload réel MinIO en smoke test.

### Critère de sortie

Chaque `screenshotArtifactId` retourné correspond à un objet réellement lisible.

---

## Jalon 5 — Renderer isolé

### Objectif

Traiter la preview générée comme un contenu hostile côté serveur et navigateur.

### Worker renderer

- contexte Playwright dédié;
- blocage réseau par défaut;
- allowlist explicite pour les assets internes signés;
- navigation externe interdite;
- timeout global;
- capture console et erreurs runtime;
- limite viewport et taille screenshot;
- fermeture garantie des pages et contextes;
- concurrence bornée;
- idéalement process ou conteneur séparé du worker provider.

### Preview navigateur

- iframe sandbox stricte;
- CSP côté sous-domaine preview lorsque disponible;
- pas de cookies applicatifs;
- pas de token dans `srcDoc`;
- `postMessage` typé uniquement si nécessaire;
- support HTML puis Sandpack React avec dépendances contrôlées.

### Tâches

- [x] Bloquer les requêtes HTTP, WebSocket et service workers dans Playwright.
- [ ] Capturer logs et erreurs comme artefact.
- [ ] Ajouter tests d'accès parent/localStorage/navigation.
- [x] Ajouter test SSRF réseau refusé.
- [ ] Ajouter limites de concurrence du renderer.
- [ ] Distinguer `RENDER_ERROR` et `PROVIDER_ERROR`.

### Critère de sortie

Un rendu malveillant ou bloqué ne peut ni accéder aux secrets du produit, ni bloquer indéfiniment le worker.

---

## Jalon 6 — API de lecture et réhydratation frontend

### Objectif

Reconstruire entièrement le workspace depuis le backend après rechargement.

### Routes minimales

```http
GET /api/projects/:projectId/screens
GET /api/screens/:screenId
GET /api/screens/:screenId/versions
GET /api/screen-versions/:screenVersionId
POST /api/screens/:screenId/current-version
GET /api/generation-jobs/:jobId
GET /api/artifacts/:artifactId
```

### Frontend

- charger les screens du projet;
- résoudre chaque node canvas vers son Screen;
- charger la version courante ou épinglée à la sélection;
- afficher screenshot dans le node;
- afficher HTML dans la preview;
- reprendre le polling des jobs non terminés;
- ne plus dépendre de `screenVersionsById` comme seule source;
- utiliser un cache de requêtes avec invalidation explicite.

React Query ou une abstraction équivalente est recommandée pour:

- cache;
- retry contrôlé;
- invalidation;
- polling;
- déduplication des requêtes.

### Tâches

- [ ] Ajouter contrats de réponse Zod.
- [x] Implémenter routes et repositories.
- [ ] Corriger le mapping canvas.
- [x] Réhydrater la preview après reload.
- [ ] Reprendre un job en cours après reload.
- [x] Afficher les screenshots réels dans le mode Snapshot de la preview.
- [ ] Ajouter tests E2E reload et redémarrage API.

### Critère de sortie

Un utilisateur peut fermer puis rouvrir l'application et retrouver le même canvas et les mêmes previews.

---

## Jalon 7 — Sauvegarde canvas robuste

### Objectif

Éviter les écrasements silencieux et préparer plusieurs onglets ou utilisateurs.

### Contrat

```json
{
  "revision": 12,
  "nodes": [],
  "edges": [],
  "viewport": {}
}
```

Le backend accepte la mise à jour uniquement si la révision reçue est la révision courante, puis retourne la nouvelle révision.

### Frontend

- debounce 300 à 500 ms;
- une sauvegarde active par canvas;
- fusion ou réenvoi du dernier état local après réponse;
- ancienne réponse incapable de remplacer un état récent;
- indication `saving`, `saved`, `conflict`, `offline`.

### Validation métier

- ids nodes uniques;
- ids edges uniques;
- edges vers nodes existants;
- références screen/artifact existantes dans le même projet;
- tailles et zoom bornés;
- maximum de nodes et edges cohérent avec le critère produit d'au moins 100 écrans.

### Tâches

- [x] Ajouter `revision` au schéma et au contrat.
- [x] Implémenter update conditionnelle.
- [x] Retourner `409 CANVAS_CONFLICT`.
- [ ] Débouncer et sérialiser les écritures frontend.
- [ ] Ajouter validation métier.
- [ ] Tester réponses désordonnées et conflit multi-onglets.

### Critère de sortie

Une ancienne sauvegarde ne peut plus remettre le canvas dans un état antérieur sans signaler un conflit.

---

## Jalon 8 — Identité, ownership et protections publiques

### Objectif

Préparer une bêta réellement accessible sans exposer les données et les coûts IA.

### Modèle

- `users`;
- `workspaces`;
- `workspace_memberships`;
- rôles initiaux `owner`, `member`;
- `projects.workspaceId`;
- principal d'auth interne indépendant du fournisseur choisi.

### Architecture d'auth

Le backend doit consommer un contrat interne:

```ts
interface AuthPrincipal {
  userId: string;
  workspaceId: string;
  role: "owner" | "member";
}
```

Un adaptateur de développement peut fournir un utilisateur local. Le fournisseur d'identité final peut être choisi sans contaminer les repositories métier.

### Protections

- authorization sur chaque ressource;
- rate limiting par utilisateur/workspace/IP;
- quotas de génération;
- limite de jobs simultanés;
- idempotency keys rattachées au workspace et au payload;
- CORS configurable;
- logs d'audit minimaux;
- URLs d'artefacts privées ou signées.

### Tâches

- [ ] Ajouter tables et migrations identité/workspaces.
- [ ] Ajouter middleware principal.
- [ ] Filtrer tous les repositories par workspace.
- [ ] Ajouter tests cross-workspace.
- [ ] Ajouter rate limiting et quotas.
- [ ] Ajouter écran de connexion lorsque le fournisseur est choisi.

### Critère de sortie

Deux workspaces ne peuvent pas lire, modifier ou dépenser les quotas l'un de l'autre.

---

## Jalon 9 — Observabilité, reprise et exploitation

### Objectif

Pouvoir diagnostiquer et opérer le produit sans lire manuellement la base.

### Logs structurés

Inclure:

- `requestId`;
- `userId` et `workspaceId` lorsque disponibles;
- `projectId`;
- `generationJobId`;
- provider et modèle;
- durée par étape;
- taille des sorties;
- nombre de tentatives;
- code d'erreur.

Ne jamais inclure:

- clés API;
- cookies;
- tokens;
- réponses provider brutes non filtrées;
- contenu privé complet par défaut.

### Métriques

- jobs queued/running/completed/failed;
- durée génération;
- taux de validation et réparation;
- erreurs provider;
- erreurs renderer;
- profondeur queue;
- taille artefacts;
- sauvegardes canvas et conflits.

### Tâches

- [ ] Ajouter logger structuré et middleware requestId.
- [ ] Ajouter métriques Prometheus ou OpenTelemetry.
- [ ] Ajouter tracing API -> queue -> worker.
- [x] Ajouter reconciliation des jobs bloqués via leases PostgreSQL renouvelés par heartbeat.
- [ ] Ajouter politique de rétention jobs/logs/artefacts.
- [ ] Documenter backup et restauration Postgres/object storage.
- [ ] Ajouter smoke test déploiement.

### Critère de sortie

Une génération lente ou échouée peut être expliquée depuis les logs et métriques avec son `jobId`.

---

## Ordre d'exécution recommandé

### Tranche A — à commencer immédiatement

1. Jalon 0: infrastructure et migrations.
2. Jalon 1: modèle canonique et repositories.
3. Jalon 2: queue et worker asynchrone.
4. Jalon 4: artefacts réels.
5. Jalon 6: routes de lecture et réhydratation.

Cette tranche rend enfin durable la boucle produit déjà visible.

### Tranche B — avant vrais utilisateurs externes

1. Jalon 5: renderer isolé.
2. Jalon 7: canvas robuste.
3. Jalon 8: identité, ownership et quotas.
4. Jalon 9: observabilité.

### Tranche C — génération réelle

1. Jalon 3: OpenAI et Anthropic.
2. validation de coût et qualité;
3. modes fast et quality;
4. réparation structurée.

Le provider mock reste utilisé pour construire et tester la Tranche A sans dépendre d'appels externes.

## Première mission d'implémentation

La première mission doit être bornée à **Jalon 0 + schéma de Jalon 1**, sans toucher encore au frontend:

> Installer l'infrastructure locale Postgres/Redis/MinIO, ajouter la validation de configuration, créer les migrations Drizzle canoniques pour workspaces, projects, canvas, screens, screen_versions, generation_jobs et artifacts, puis implémenter et tester les repositories Postgres de lecture/écriture de base.

### Sous-agents recommandés

1. `data-modeler`: schéma, migrations, contraintes et fixtures;
2. `backend-builder`: configuration, repositories et readiness;
3. `qa-reviewer`: tests de migration et intégration;
4. `security-reviewer`: secrets, object storage et frontières tenant;
5. `docs-maintainer`: synchronisation data model/API/roadmap.

Ne pas paralléliser deux agents sur le même schéma DB. Le `data-modeler` termine le contrat avant le `backend-builder`.

## Vérification globale du plan

```bash
pnpm install
pnpm infra:up
pnpm db:migrate
pnpm typecheck
pnpm test:unit
pnpm test:integration
pnpm test:e2e
pnpm build
pnpm check:links
```

## Critère de sortie du plan complet

Le produit satisfait les invariants suivants:

- aucun résultat utile n'est perdu au redémarrage;
- aucun artifact id ne pointe vers une ressource inexistante;
- le POST de génération ne bloque pas sur le provider ou Chromium;
- un node canvas stable continue d'afficher l'écran lorsque sa version courante change;
- une preview historique peut être retrouvée depuis une `ScreenVersion`;
- le renderer ne dispose ni du réseau ouvert ni des secrets IA;
- le backend contrôle les mutations et les droits;
- les phases versions, variantes, design system, exports et Eve peuvent se construire sur ces contrats sans refonte du coeur.
