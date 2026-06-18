# Open Design Canvas Docs

Ce dossier contient la documentation de cadrage pour construire un outil open source inspiré de Google Stitch, Claude Design et Claude Artifacts.

Le but n'est pas de cloner Figma. Le but est de construire un environnement agentique de design logiciel:

- prompt vers interface;
- preview live dans le navigateur;
- canvas infini pour organiser les écrans;
- versions et variantes;
- design system portable;
- exports vers HTML, React et, plus tard, Figma.

## Lecture recommandée

1. [Index documentaire](docs/00-index.md)
2. [Spec produit](docs/01-product-spec.md)
3. [Architecture](docs/02-architecture.md)
4. [Stack technique](docs/03-tech-stack.md)
5. [Roadmap](docs/11-roadmap.md)
6. [Providers IA OpenAI et Anthropic](docs/15-ai-providers.md)
7. [Estimation avec Codex et Claude Code](docs/12-estimates-with-agents.md)
8. [Integration Eve pour les agents](docs/13-eve-agent-framework.md)
9. [Organisation des sous-agents](docs/14-subagent-operating-model.md)
10. [Audit de préparation produit](docs/16-production-readiness-audit.md)
11. [Plan de fondation produit durable](docs/plans/10-durable-product-foundation.md)

## Plans d'implémentation

Les plans sont découpés pour permettre une exécution progressive avec Codex et Claude Code:

- [Plan 1: fondation MVP](docs/plans/01-mvp-foundation.md)
- [Plan 2: génération et preview](docs/plans/02-generation-preview.md)
- [Plan 3: canvas infini](docs/plans/03-canvas.md)
- [Plan 4: versions et variantes](docs/plans/04-versions-variants.md)
- [Plan 5: design system](docs/plans/05-design-system.md)
- [Plan 6: exports](docs/plans/06-exports.md)
- [Plan 7: runtime agents Eve](docs/plans/07-agent-runtime-eve.md)
- [Plan 8: MCP connaissance](docs/plans/08-knowledge-mcp.md)
- [Plan 9: organisation des sous-agents](docs/plans/09-subagent-development-organization.md)
- [Plan 10: fondation produit durable](docs/plans/10-durable-product-foundation.md)

## Organisation agentique

- [Guide racine agents](AGENTS.md)
- [Modele operationnel des sous-agents](docs/14-subagent-operating-model.md)
- [Playbooks agents](docs/agent-playbooks/)

## Décisions d'architecture

- [ADR 0001: choix canvas](docs/adr/0001-canvas-choice.md)
- [ADR 0002: preview sandbox](docs/adr/0002-preview-sandbox.md)

## Sources publiques utilisées

- Google Stitch launch: https://developers.googleblog.com/stitch-a-new-way-to-design-uis/
- Google Stitch 2026 canvas: https://blog.google/innovation-and-ai/models-and-research/google-labs/stitch-ai-ui-design/
- Google Stitch SDK: https://github.com/google-labs-code/stitch-sdk
- Google Stitch Skills: https://github.com/google-labs-code/stitch-skills
- Anthropic Claude Design: https://www.anthropic.com/news/claude-design-anthropic-labs
- Claude Artifacts help: https://support.claude.com/en/articles/9487310-what-are-artifacts-and-how-do-i-use-them
- Claude powered artifacts: https://claude.com/blog/claude-powered-artifacts
- Anthropic web artifacts builder: https://github.com/anthropics/skills/blob/main/skills/web-artifacts-builder/SKILL.md
- tldraw SDK: https://tldraw.dev/
- Excalidraw integration: https://docs.excalidraw.com/docs/%40excalidraw/excalidraw/integration
- Sandpack docs: https://sandpack.codesandbox.io/docs/advanced-usage/components
- WebContainers: https://blog.stackblitz.com/posts/introducing-webcontainers/
- Figma Plugin API: https://developers.figma.com/docs/plugins/
- Eve documentation: https://eve.dev/docs/introduction
