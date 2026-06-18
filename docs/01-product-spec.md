# Spec Produit

## Nom

Open Design Canvas

## Résumé

Open Design Canvas est un outil open source pour générer, prévisualiser, organiser et exporter des interfaces web depuis un prompt, une image, un extrait de code ou un design system.

Le produit combine trois expériences:

- un chat agentique pour décrire et modifier des interfaces;
- une preview live pour voir le résultat exécutable;
- un canvas infini pour organiser les écrans, prompts, assets et variantes.

## Objectifs

- Générer rapidement des maquettes UI exploitables.
- Réduire la friction entre idée, design et code.
- Garder les résultats modifiables et versionnés.
- Rendre le système indépendant d'un fournisseur de modèle IA.
- Fournir des exports utiles: HTML autonome, React/Tailwind, puis Figma.

## Non-objectifs MVP

- Remplacer Figma.
- Faire une collaboration temps réel complète dès le début.
- Garantir du code production-ready sur tous les prompts.
- Supporter toutes les stacks frontend.
- Créer un éditeur vectoriel complet.
- Construire un marketplace de templates.

## Utilisateurs cibles

### Founder ou maker

Il veut transformer une idée en prototype visuel partageable. Il préfère un rendu rapide à une précision pixel-perfect.

### Développeur frontend

Il veut obtenir un point de départ React/Tailwind propre, puis reprendre le code dans son projet.

### Designer technique

Il veut explorer plusieurs directions visuelles sans passer par un long cycle de wireframes.

### Equipe produit

Elle veut créer des flows, tester plusieurs variantes et préparer un handoff vers le code.

## Parcours MVP

1. L'utilisateur crée un projet.
2. Il écrit: "Crée un dashboard SaaS de monitoring avec sidebar, cartes de métriques et graphique d'activité."
3. Le système génère un écran.
4. La preview affiche l'interface.
5. Un screenshot est créé automatiquement.
6. L'écran apparaît sur le canvas.
7. L'utilisateur demande: "Fais une version plus dense et moins marketing."
8. Une nouvelle version est créée.
9. L'utilisateur génère trois variantes.
10. Il exporte le meilleur écran en HTML ou React/Tailwind.

## Fonctionnalités MVP

### Projets

- Créer un projet.
- Lister les projets.
- Ouvrir un projet.
- Renommer un projet.

### Génération d'écrans

- Générer un écran depuis un prompt texte.
- Choisir un device target: mobile, tablet, desktop ou agnostic.
- Stocker le prompt source.
- Stocker la sortie structurée et le code généré.

### Preview

- Rendre le code généré dans une iframe sécurisée.
- Capturer erreurs console et erreurs runtime.
- Afficher un état de chargement, succès ou échec.
- Permettre de relancer une génération après erreur.

### Canvas

- Afficher les écrans comme nodes visuels.
- Déplacer les nodes.
- Zoomer et naviguer.
- Relier des écrans par des liens de prototype.
- Afficher prompts, screenshots et métadonnées.

### Versions

- Créer une version à chaque génération ou édition.
- Revenir à une version précédente.
- Comparer les screenshots de deux versions.

### Variantes

- Générer plusieurs directions depuis un écran existant.
- Choisir les axes: layout, couleur, typographie, contenu.
- Conserver chaque variante comme écran ou version.

### Design system

- Créer un DESIGN.md par projet.
- Définir couleurs, typographie, spacing, radius et règles de style.
- Appliquer ces règles aux générations.

### Exports

- Télécharger un HTML autonome.
- Télécharger un projet React/Tailwind minimal.
- Copier le code d'un composant.

## Fonctionnalités V2

- Import d'image ou wireframe.
- Import d'URL avec extraction visuelle.
- Critique visuelle automatique par modèle multimodal.
- Collaboration temps réel.
- Handoff vers Codex ou Claude Code.
- Plugin Figma pour créer des frames éditables.
- Exports PDF et PPTX.
- Exécution de workflows agentiques avec MCP.

## Critères de succès MVP

- Un utilisateur peut générer un écran visible en moins de 60 secondes.
- Le rendu preview ne peut pas casser l'application hôte.
- Un projet peut contenir au moins 100 écrans sans dégradation majeure.
- Le même écran peut être exporté en HTML autonome.
- Le modèle de données conserve assez de structure pour générer React et Figma plus tard.

## Contraintes

- Le produit doit rester modèle-agnostique.
- Les contenus générés doivent être sandboxés.
- Les données doivent être versionnées.
- Les exports doivent être reproductibles depuis les données stockées.
- Les composants internes doivent rester petits et testables.

