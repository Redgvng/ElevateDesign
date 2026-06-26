import type { DesignSpec } from "@odc/shared";

/** Truncates text to a bounded length with an explicit elision marker. */
export function boundedText(text: string, maxChars = 600): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}… (+${text.length - maxChars} chars)`;
}

function countNodes(spec: DesignSpec): number {
  let count = 0;
  const walk = (node: DesignSpec["root"]): void => {
    count += 1;
    for (const child of node.children) walk(child);
  };
  walk(spec.root);
  return count;
}

/**
 * Compact, model-facing summary of a DesignSpec. Keeps the agent oriented
 * without dumping the full structured tree into the context window.
 */
export function summarizeDesignSpec(spec: DesignSpec): string {
  const parts = [
    `title="${spec.title}"`,
    `device=${spec.deviceType}`,
    `viewport=${spec.viewport.width}x${spec.viewport.height}`,
    `nodes=${countNodes(spec)}`,
  ];
  if (spec.moduleRefs && spec.moduleRefs.length > 0) {
    parts.push(`modules=[${spec.moduleRefs.join(", ")}]`);
  }
  return parts.join(" ");
}

/** Compact summary of Zod-style validation issues for repair loops. */
export function summarizeValidationIssues(
  issues: Array<{ path?: Array<string | number>; message: string }>,
): string {
  if (issues.length === 0) return "valid";
  const shown = issues.slice(0, 8).map((issue) => {
    const path = issue.path && issue.path.length > 0 ? issue.path.join(".") : "(root)";
    return `${path}: ${issue.message}`;
  });
  const extra = issues.length > shown.length ? ` (+${issues.length - shown.length} more)` : "";
  return `${issues.length} issue(s): ${shown.join("; ")}${extra}`;
}

/** Summarizes a generated artifact (e.g. HTML/screenshot) by size, never inline. */
export function summarizeArtifact(input: {
  kind: string;
  byteSize: number;
  ref?: string | null;
}): string {
  const ref = input.ref ? ` ref=${input.ref}` : "";
  return `${input.kind} ${formatBytes(input.byteSize)}${ref}`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
