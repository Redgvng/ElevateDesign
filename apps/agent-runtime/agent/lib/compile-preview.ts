import { designSpecToHtml } from "@odc/shared";
import { summarizeArtifact, summarizeDesignSpec } from "./model-output";
import { validateDesignSpec } from "./validate-design-spec";

export type CompilePreviewResult =
  | { compiled: true; byteSize: number; htmlCode: string; summary: string }
  | { compiled: false; reason: "invalid_spec"; summary: string };

/**
 * Deterministic preview compilation through the shared DesignSpec compiler.
 * Guards on validation so the agent gets a clear repair signal, and returns a
 * bounded summary (the full HTML stays in the structured result, not the model
 * context).
 */
export function compilePreview(input: unknown): CompilePreviewResult {
  const validation = validateDesignSpec(input);
  if (!validation.valid) {
    return { compiled: false, reason: "invalid_spec", summary: validation.summary };
  }

  const htmlCode = designSpecToHtml(validation.designSpec);
  const byteSize = Buffer.byteLength(htmlCode, "utf8");
  return {
    compiled: true,
    byteSize,
    htmlCode,
    summary: `${summarizeDesignSpec(validation.designSpec)} -> ${summarizeArtifact({ kind: "html", byteSize })}`,
  };
}
