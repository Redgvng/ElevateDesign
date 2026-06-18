# Estimation Avec Codex et Claude Code

## Hypothèses

- Une personne technique pilote le projet.
- Codex est utilisé pour implémenter, tester, refactorer et vérifier.
- Claude Code est utilisé pour produire des variantes UI, écrire des composants, générer des prompts et aider aux tâches de design.
- Le produit est construit en local d'abord.
- Pas de billing, pas d'auth SaaS complexe, pas de collaboration temps réel dans le MVP.

## Estimation globale

### MVP minimal

Durée: 2 à 3 semaines full-time.

Contenu:

- projets;
- prompt vers écran;
- preview;
- canvas;
- versions simples;
- export HTML.

### MVP solide

Durée: 4 à 6 semaines full-time.

Contenu:

- tout le MVP minimal;
- variantes;
- DESIGN.md;
- export React;
- screenshots Playwright;
- sécurité preview plus sérieuse;
- tests e2e.

### Version V2

Durée: 2 à 4 mois full-time.

Contenu:

- critique visuelle;
- import URL/image;
- plugin Figma;
- collaboration;
- workflows MCP;
- partage.

## Estimation par phase

| Phase | Sans agents | Avec Codex/Claude Code | Risque |
| --- | ---: | ---: | --- |
| Fondation app | 4-7 jours | 1-2 jours | Faible |
| Génération + validation | 7-12 jours | 3-5 jours | Moyen |
| Preview sandbox | 6-10 jours | 3-5 jours | Moyen |
| Canvas | 7-14 jours | 3-6 jours | Moyen |
| Versions + variantes | 5-8 jours | 2-4 jours | Faible |
| DESIGN.md | 5-8 jours | 2-4 jours | Moyen |
| Export HTML/React | 6-10 jours | 2-5 jours | Moyen |
| Plugin Figma | 10-20 jours | 5-10 jours | Elevé |
| Collaboration temps réel | 15-30 jours | 7-15 jours | Elevé |

## Où les agents font gagner du temps

- Génération boilerplate React/TypeScript.
- Création de schemas Zod.
- Tests unitaires et fixtures.
- Composants shadcn/ui.
- Refactor de fichiers.
- Rédaction prompts système.
- Génération d'exemples de DesignSpec.
- Scripts d'export.
- Tests Playwright.

## Où les agents ne compressent pas beaucoup

- Choix d'architecture.
- Debug sandbox navigateur.
- Qualité produit du canvas.
- Sécurité d'exécution de code non fiable.
- Export Figma éditable.
- UX de workflows complexes.

## Mode de travail recommandé

### Codex

Utiliser Codex pour:

- créer la structure de repo;
- implémenter chaque plan;
- écrire tests;
- lancer vérifications;
- faire les refactors;
- corriger bugs.

### Claude Code

Utiliser Claude Code pour:

- explorer variantes UI;
- générer composants visuels;
- créer prompts de design;
- produire exemples de DESIGN.md;
- aider sur les exports React;
- comparer approches.

### Répartition pratique

1. Codex implémente le socle.
2. Claude Code génère des composants UI ou variantes isolées.
3. Codex intègre proprement dans le codebase.
4. Codex lance tests et Playwright.
5. Claude Code aide à enrichir DESIGN.md et prompts.

## Planning conseillé

### Semaine 1

- créer repo;
- app Vite;
- backend;
- DB;
- projets;
- layout workspace;
- premier prompt mocké vers écran statique.

### Semaine 2

- provider IA;
- DesignSpec;
- validation;
- preview iframe/Sandpack;
- screenshots;
- canvas.

### Semaine 3

- versions;
- variantes;
- export HTML;
- premiers tests e2e.

### Semaine 4

- DESIGN.md;
- export React;
- sécurité preview;
- polish UX;
- documentation développeur.

## Décision recommandée

Attaquer immédiatement par le Plan 1 et refuser les fonctionnalités V2 tant que le flux suivant n'est pas stable:

```txt
Project -> Prompt -> DesignSpec -> Preview -> Screenshot -> Canvas Node -> Export HTML
```

