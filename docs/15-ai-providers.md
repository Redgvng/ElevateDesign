# Providers IA OpenAI et Anthropic

## Objectif

Open Design Canvas doit supporter OpenAI et Anthropic des la Phase 2 sans lier le produit a un fournisseur unique.

Le backend et les workers parlent a une abstraction interne `AiProvider`. Les SDKs OpenAI et Anthropic sont des adaptateurs interchangeables derriere cette interface. Le `DesignSpec` reste la source de verite, pas la reponse brute du modele.

## Phase concernee

L'integration commence en Phase 2, avec le pipeline prompt vers preview:

1. l'utilisateur envoie un prompt;
2. le backend cree un `GenerationJob`;
3. le worker choisit un provider;
4. le provider appelle OpenAI ou Anthropic;
5. la sortie est parsee en JSON structure;
6. le `DesignSpec` est valide par Zod;
7. le `DesignSpec` est compile vers HTML/React;
8. la preview rend le resultat dans un environnement sandboxe.

Eve peut orchestrer ce pipeline en Phase 7, mais Eve ne doit pas etre requis pour utiliser OpenAI ou Anthropic dans le MVP.

## Packages cibles

Dependances initiales:

```json
{
  "dependencies": {
    "openai": "latest",
    "@anthropic-ai/sdk": "latest"
  }
}
```

Les versions exactes doivent etre epinglees au moment de l'implementation.

## Variables d'environnement

```bash
AI_PROVIDER=openai
OPENAI_API_KEY=...
OPENAI_MODEL=...

ANTHROPIC_API_KEY=...
ANTHROPIC_MODEL=...
```

Regles:

- `AI_PROVIDER` accepte `mock`, `openai`, `anthropic`.
- `mock` reste le provider par defaut en developpement local et dans les tests deterministes.
- les cles API ne transitent jamais vers le frontend, les prompts generes, les exports ou les sandboxes.
- les modeles sont configurables par environnement, pas hardcodes dans les composants produit.

## Interface commune

Le contrat interne reste provider-agnostique:

```ts
type AiProvider = {
  generateStructuredDesign(input: GenerateDesignInput): Promise<GenerateDesignOutput>;
  repairStructuredDesign?(input: RepairDesignInput): Promise<GenerateDesignOutput>;
  critiqueVisual?(input: VisualCritiqueInput): Promise<VisualCritique>;
};
```

Les adaptateurs doivent retourner la meme forme:

```ts
type GenerateDesignOutput = {
  designSpec: DesignSpec;
  raw?: unknown;
  provider: "mock" | "openai" | "anthropic";
  model: string;
};
```

Le champ `raw` sert au debug serveur uniquement. Il ne doit pas devenir source de verite et ne doit pas etre expose tel quel au client.

## Adaptateur OpenAI

Fichier cible:

```text
apps/worker/src/providers/OpenAiProvider.ts
```

Responsabilites:

- utiliser le SDK officiel `openai`;
- appeler l'API Responses pour produire une sortie structuree;
- demander une reponse JSON conforme au schema attendu;
- normaliser la sortie vers `GenerateDesignOutput`;
- propager les erreurs avec un code exploitable par le job: `PROVIDER_ERROR`, `PROVIDER_TIMEOUT`, `PROVIDER_RATE_LIMIT`, `INVALID_PROVIDER_OUTPUT`.

Le provider OpenAI ne compile pas le HTML et ne persiste rien. Il ne fait que produire un candidat `DesignSpec`.

## Adaptateur Anthropic

Fichier cible:

```text
apps/worker/src/providers/AnthropicProvider.ts
```

Responsabilites:

- utiliser le SDK officiel `@anthropic-ai/sdk`;
- appeler l'API Messages de Claude;
- demander une sortie JSON stricte contenant `brief` et `designSpec`;
- extraire le texte JSON depuis la reponse Claude;
- normaliser la sortie vers `GenerateDesignOutput`;
- propager les memes codes d'erreur que l'adaptateur OpenAI.

Anthropic ne doit pas etre appele via une compatibilite OpenAI par defaut. L'adaptateur dedie garde les differences de format, system prompt, messages et erreurs dans un seul fichier.

## Selection du provider

Ajouter une factory:

```text
apps/worker/src/providers/createAiProvider.ts
```

Comportement:

```ts
function createAiProvider(config: AiProviderConfig): AiProvider {
  switch (config.provider) {
    case "openai":
      return new OpenAiProvider(config.openai);
    case "anthropic":
      return new AnthropicProvider(config.anthropic);
    case "mock":
    default:
      return new MockAiProvider();
  }
}
```

Le choix du provider doit etre fait cote worker ou backend, jamais cote generated UI.

## Prompt et sortie structuree

Les deux providers doivent recevoir le meme contexte fonctionnel:

- prompt utilisateur;
- device target;
- contraintes runtime MVP;
- `DESIGN.md` si disponible;
- ecran existant pour une edition;
- schema attendu du `DesignSpec`;
- interdiction des dependances non supportees;
- interdiction de secrets, tokens ou appels reseau arbitraires dans le code genere.

La sortie attendue reste:

```json
{
  "brief": {
    "goal": "string",
    "audience": "string",
    "tone": "string"
  },
  "designSpec": {}
}
```

Le parser doit refuser:

- markdown autour du JSON si le mode structure force du provider peut l'eviter;
- champs inconnus dangereux;
- code inline qui contourne le `DesignSpec`;
- references a assets non declares;
- tailles ou profondeurs de tree excessives.

## Reparation

Quand la validation Zod echoue:

1. conserver l'erreur exacte;
2. rappeler le meme provider avec le JSON invalide et l'erreur;
3. demander une correction minimale du `DesignSpec`;
4. limiter a deux tentatives automatiques;
5. marquer le job `failed` si la sortie reste invalide.

Ne pas changer automatiquement de provider pendant une reparation, sauf si une future option explicite `fallbackProvider` est ajoutee.

## Tests attendus

Tests unitaires:

- `MockAiProvider` reste deterministe;
- `createAiProvider` choisit le bon adaptateur;
- erreurs provider mappees vers les codes internes;
- JSON invalide rejete avant compilation;
- sortie OpenAI fixture -> `DesignSpec` valide;
- sortie Anthropic fixture -> `DesignSpec` valide.

Tests d'integration optionnels:

- actives seulement si `OPENAI_API_KEY` ou `ANTHROPIC_API_KEY` est present;
- skip par defaut en CI publique;
- aucun snapshot ne doit contenir de cle API ou de reponse brute sensible.

## Securite

- Les SDKs tournent uniquement cote serveur ou worker.
- Les cles restent dans l'environnement d'execution backend/worker.
- Les prompts doivent etre nettoyes des secrets connus avant appel provider.
- Les sorties modele sont non fiables jusqu'a validation Zod et validation de securite.
- Le HTML/React compile depuis `DesignSpec` reste sandboxe dans la preview.
- Eve et MCP ne recoivent que le contexte strictement necessaire et ne possedent pas les mutations produit.

## Documentation officielle

- OpenAI Responses API: https://platform.openai.com/docs/api-reference/responses
- OpenAI SDK TypeScript: https://github.com/openai/openai-node
- Anthropic TypeScript SDK: https://docs.anthropic.com/en/api/client-sdks
- Anthropic Messages API: https://docs.anthropic.com/en/api/messages
