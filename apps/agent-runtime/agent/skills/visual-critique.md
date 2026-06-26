# Visual critique

How to critique a generated screen before accepting it.

## What to check

- **Hierarchy**: is the primary action/metric obvious? One clear focal point.
- **Density**: dense where data-heavy (tables, metrics), generous whitespace
  between sections.
- **Consistency**: colors, spacing and typography follow the project design
  system; one accent color, no gradients.
- **Completeness**: every region named in the brief is present.

## Workflow

1. Inspect the spec summary and (if available) the screenshot artifact.
2. List concrete, actionable defects — not vague impressions.
3. If defects exist, author a repaired `DesignSpec`, re-validate, and persist a
   new version. Otherwise accept.
