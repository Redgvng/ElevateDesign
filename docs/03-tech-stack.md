# Stack Technique

## Stack recommandée MVP

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Radix UI
- Lucide
- Excalidraw
- Sandpack
- Monaco Editor

### Backend

- Node.js
- Fastify ou Hono
- Zod
- Drizzle ORM
- PostgreSQL
- Redis
- BullMQ

### Workers

- Node.js
- Playwright
- Sharp pour traitement image si nécessaire
- S3/R2/MinIO pour assets

### IA

- Interface provider-agnostique.
- Eve comme runtime agentique pour orchestration, tools, skills, subagents, sandbox et evals.
- MCP interne pour exposer docs, schemas et playbooks aux agents.
- Providers initiaux MVP:
  - OpenAI Responses API;
  - Anthropic Claude API;
  - mock provider deterministe pour tests et developpement local.
- Providers possibles plus tard:
  - Google Gemini API;
  - Ollama pour local.
- Voir [Providers IA OpenAI et Anthropic](15-ai-providers.md) pour les contrats SDK, variables d'environnement et tests attendus.

### Agent Runtime

- Eve dans `apps/agent-runtime`.
- Node.js 24 ou plus.
- Tools TypeScript validés par Zod.
- Subagents déclarés pour planner, generator, critic et exporter.
- Evals Eve pour verrouiller les comportements agentiques critiques.

### MCP

- Serveur MCP interne dans `packages/mcp-knowledge`.
- Transport Streamable HTTP ou SSE pour Eve.
- Transport stdio optionnel pour développement local.
- Recherche textuelle déterministe au démarrage, embeddings plus tard si nécessaire.

### Tests

- Vitest pour logique TypeScript.
- React Testing Library pour composants.
- Playwright pour tests end-to-end et screenshots.
- Zod schemas testés avec fixtures.

## Choix par défaut

### Vite plutôt que Next.js

Vite réduit la complexité initiale. Le produit est d'abord un outil interactif client-heavy. Next.js devient intéressant si le produit ajoute SSR public, auth avancée, billing et partage SEO.

### Excalidraw plutôt que tldraw au démarrage

Excalidraw est suffisant pour le MVP et évite une contrainte de licence plus complexe. tldraw reste une option supérieure si le canvas devient le coeur différenciant du produit.

### Sandpack plutôt que WebContainers au démarrage

Sandpack suffit pour prévisualiser React et HTML simples. WebContainers devient pertinent pour exécuter de vrais projets Node, installer des dépendances dynamiques et lancer des serveurs dans le navigateur.

### Drizzle plutôt que Prisma

Drizzle garde un contrôle clair sur les migrations SQL et les types. Prisma reste acceptable si l'équipe le maîtrise déjà.

### Eve comme runtime agentique, pas backend produit

Eve apporte la durabilité des sessions, les tools, les skills, les subagents et les evals. Il ne remplace pas l'API backend, Postgres, le modèle `DesignSpec` ou les workers de rendu. L'intégration doit rester isolée derrière `apps/agent-runtime` et des contrats backend stables.

## Alternatives par brique

### Canvas

- Excalidraw: simple, open source, rapide à intégrer.
- tldraw: très puissant, excellent SDK, vérifier licence.
- React Flow: bon pour graphes, moins adapté au design canvas libre.
- Fabric.js/Konva: bas niveau, plus de travail produit.

### Preview

- Sandpack: meilleur compromis MVP.
- iframe custom: nécessaire pour HTML autonome et sécurité fine.
- WebContainers: puissant mais plus complexe.
- StackBlitz SDK: utile pour environnements complets.

### UI

- shadcn/ui: excellent pour génération IA et ownership du code.
- Mantine: rapide, cohérent, mais moins standard dans les générations LLM.
- Chakra UI: productif mais moins flexible pour design system custom.

### Collaboration

- Yjs: standard robuste pour CRDT.
- Liveblocks: rapide mais moins open source.
- Automerge: solide mais moins orienté UI collaborative immédiate.

## Risques techniques

- Sorties IA instables ou non valides.
- APIs Eve en beta, donc potentiellement mouvantes.
- Couplage excessif à Vercel si le runtime agentique déborde sur le backend produit.
- HTML généré dangereux si non sandboxé.
- Canvas qui devient lent avec trop de nodes.
- Exports React difficiles si la source de vérité est seulement HTML.
- Plugin Figma plus long que prévu.

## Mitigations

- Forcer la sortie IA en JSON validé par Zod.
- Isoler Eve dans une app runtime dédiée et garder les mutations dans le backend.
- Garder un fallback provider direct jusqu'à stabilisation du runtime agentique.
- Toujours sandboxer le rendu.
- Stocker screenshots optimisés.
- Garder un DesignSpec structuré comme source de vérité.
- Reporter Figma après HTML/React.
