# Sécurité

## Risque principal

Le produit génère et exécute du code non fiable. Le runtime de preview doit être traité comme hostile.

## Menaces

### XSS dans l'application hôte

Un HTML généré peut contenir scripts, handlers ou CSS malveillant.

Mitigation:

- jamais injecter dans le DOM principal;
- iframe sandbox;
- DOMPurify pour contenus non exécutables;
- CSP stricte.

### Escape de sandbox

Une iframe trop permissive peut accéder au contexte parent.

Mitigation:

- éviter `allow-same-origin` avec `allow-scripts`;
- servir la preview depuis un domaine séparé en production;
- limiter les permissions iframe.

### Exfiltration

Le code généré peut tenter d'envoyer des données à l'extérieur.

Mitigation:

- bloquer réseau dans le renderer serveur si possible;
- CSP `connect-src 'none'` pour HTML autonome de preview;
- ne jamais exposer tokens ou secrets dans le contexte preview.

### Prompt injection

Une URL importée ou un fichier peut contenir des instructions malveillantes pour l'agent.

Mitigation:

- séparer contenu source et instructions système;
- marquer les sources externes comme non fiables;
- limiter les outils disponibles au modèle;
- validation stricte des sorties.

### Supply chain

Les sorties IA peuvent demander des packages arbitraires.

Mitigation:

- whitelist de dépendances pour preview MVP;
- Sandpack configuré avec dépendances contrôlées;
- pas d'installation npm automatique sans validation.

## Politique iframe MVP

```html
<iframe
  sandbox="allow-scripts"
  referrerpolicy="no-referrer"
  csp="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:;"
></iframe>
```

La prise en charge de `csp` sur iframe dépend du navigateur. En production, préférer des headers CSP côté serveur sur un sous-domaine isolé.

## Sous-domaine de preview

Production recommandée:

- app: `app.example.com`;
- preview: `preview.exampleusercontent.com`.

Le domaine preview:

- ne partage pas les cookies app;
- n'a pas accès aux tokens;
- sert uniquement des artefacts temporaires;
- applique CSP stricte.

## Données sensibles

Règles:

- ne pas envoyer de secrets au modèle;
- masquer tokens dans logs;
- ne pas stocker prompts contenant credentials détectés;
- ajouter une détection basique de secrets avant appel IA.

## Logging

Capturer:

- job id;
- provider IA;
- durée;
- erreurs validation;
- erreurs runtime;
- taille payload.

Ne pas logger:

- clés API;
- cookies;
- access tokens;
- contenu de fichiers marqués privés.

## Tests sécurité MVP

- Un script généré ne peut pas lire `window.parent.document`.
- Un script généré ne peut pas accéder au localStorage de l'application.
- Un HTML généré ne peut pas naviguer la page parent.
- Une erreur runtime ne casse pas l'application.
- Un prompt demandant d'installer un package inconnu est refusé ou ignoré.

