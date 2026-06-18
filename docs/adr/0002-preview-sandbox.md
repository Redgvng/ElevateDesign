# ADR 0002: Choix du Runtime de Preview

Date: 2026-06-17

## Statut

Accepté pour MVP.

## Décision

Utiliser deux modes de preview:

- Sandpack pour React/Tailwind;
- iframe sandbox pour HTML autonome.

## Contexte

Le produit doit afficher du code généré par IA. Ce code est non fiable. Il ne doit jamais s'exécuter dans le DOM principal.

## Options considérées

### Sandpack

Bon pour composants React et artefacts interactifs.

### iframe sandbox

Simple et contrôlable pour HTML autonome.

### WebContainers

Très puissant pour projets complets, mais plus lourd que nécessaire au MVP.

## Raisons

Sandpack accélère la preview React. L'iframe sandbox couvre les exports HTML et donne un chemin sécurité clair. WebContainers est gardé pour une V2 de type IDE.

## Conséquences

- Le MVP limite les dépendances autorisées.
- Les previews sont isolées.
- Le bridge console/errors doit être écrit.
- La production devra utiliser un domaine séparé pour renforcer l'isolation.

## Règles

- Ne jamais utiliser `dangerouslySetInnerHTML` dans l'application hôte pour afficher du code généré.
- Ne pas autoriser `allow-same-origin` avec scripts dans l'iframe MVP.
- Tous les messages iframe doivent passer par `postMessage` typé.

