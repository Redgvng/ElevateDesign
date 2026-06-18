# ADR 0001: Choix du Canvas

Date: 2026-06-17

## Statut

Accepté pour MVP.

## Décision

Utiliser Excalidraw pour le MVP.

## Contexte

Open Design Canvas a besoin d'un canvas infini pour organiser prompts, screenshots, écrans, variantes et notes. Le canvas doit être disponible rapidement, embeddable dans React et suffisamment stable pour construire une première boucle produit.

## Options considérées

### Excalidraw

Simple à intégrer, open source, suffisant pour créer et déplacer des objets visuels.

### tldraw

Meilleur SDK canvas produit, custom shapes puissantes, mais engagement technique et licence à vérifier.

### React Flow

Très bon pour workflows et graphes, moins adapté à une surface de design libre.

## Raisons

Excalidraw maximise la vitesse de MVP et réduit les risques de licence. Le produit doit d'abord prouver la boucle prompt vers preview vers canvas. Si cette boucle fonctionne, une migration vers tldraw pourra être justifiée.

## Conséquences

- Le MVP aura un canvas simple.
- Les custom shapes seront limitées.
- Le modèle CanvasDocument doit rester indépendant d'Excalidraw pour permettre une migration.

## Condition de révision

Revoir ce choix si:

- les nodes deviennent très interactifs;
- les performances déclinent avec beaucoup d'écrans;
- la collaboration temps réel devient prioritaire;
- l'UX canvas devient la différenciation principale.

