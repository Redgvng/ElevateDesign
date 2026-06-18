import type { CreateGenerationJobInput, DesignSpec } from "@odc/shared";

export type GenerateDesignInput = CreateGenerationJobInput & {
  projectId: string;
};

export type GenerateDesignOutput = {
  designSpec: DesignSpec;
};

export type AiProvider = {
  generateStructuredDesign(input: GenerateDesignInput): Promise<GenerateDesignOutput>;
};
