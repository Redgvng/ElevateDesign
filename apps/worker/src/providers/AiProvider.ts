import type { DeviceType, DesignSpec, GenerationJobType, GenerationMode } from "@odc/shared";

export type GenerateDesignInput = {
  type: GenerationJobType;
  projectId: string;
  prompt: string;
  deviceType: DeviceType;
  mode: GenerationMode;
  screenId?: string;
  baseDesignSpec?: DesignSpec;
  variantIndex?: number;
  designContext?: string | null;
};

export type GenerateDesignOutput = {
  designSpec: DesignSpec;
};

export type AiProvider = {
  generateStructuredDesign(input: GenerateDesignInput): Promise<GenerateDesignOutput>;
};
