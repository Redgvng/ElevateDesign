import {
  DefaultModuleCatalog,
  type DeviceType,
  type ModuleDefinition,
  type ScreenPlan,
} from "@odc/shared";

export type ModuleCandidate = {
  module: ModuleDefinition;
  score: number;
  matchedSignals: string[];
  selectedVariantId: string;
};

/** Builds a traceable ScreenPlan from the deterministic module selection. */
export function buildScreenPlan(input: SelectModuleCandidatesInput): ScreenPlan {
  const candidates = selectModuleCandidates(input);
  return {
    prompt: input.prompt,
    deviceType: input.deviceType,
    modules: candidates.map((candidate) => ({
      moduleId: candidate.module.id,
      variantId: candidate.selectedVariantId,
      score: candidate.score,
      matchedSignals: candidate.matchedSignals,
    })),
  };
}

export type SelectModuleCandidatesInput = {
  prompt: string;
  deviceType: DeviceType;
  maxModules?: number;
  catalog?: ModuleDefinition[];
};

export function selectModuleCandidates({
  prompt,
  deviceType,
  maxModules = 6,
  catalog = DefaultModuleCatalog,
}: SelectModuleCandidatesInput): ModuleCandidate[] {
  const normalizedPrompt = prompt.toLowerCase();
  const boundedMaxModules = Math.max(1, Math.min(6, Math.floor(maxModules)));

  const initiallyScored = catalog
    .filter((module) => supportsDevice(module, deviceType))
    .map((module) => scoreModule(module, normalizedPrompt))
    .filter((candidate) => candidate.score > 0);
  const primaryCandidate = [...initiallyScored].sort(compareCandidates)[0];
  const primaryCompatibleFamilies = new Set(
    primaryCandidate?.module.selectionHeuristics.compatibleFamilies ?? [],
  );
  const scored = initiallyScored
    .map((candidate) => ({
      ...candidate,
      score: candidate.score + (primaryCompatibleFamilies.has(candidate.module.family) ? 2 : 0),
    }))
    .sort(compareCandidates);

  const candidates = scored.length > 0 ? scored : fallbackCandidates(catalog, deviceType);
  return diversifyFamilies(candidates, boundedMaxModules);
}

function scoreModule(module: ModuleDefinition, normalizedPrompt: string): ModuleCandidate {
  const matchedSignals = module.selectionHeuristics.positivePromptSignals.filter((signal) =>
    normalizedPrompt.includes(signal.toLowerCase()),
  );
  const negativeSignals = module.selectionHeuristics.negativePromptSignals.filter((signal) =>
    normalizedPrompt.includes(signal.toLowerCase()),
  );
  const tagSignals = module.intentTags.filter((tag) =>
    normalizedPrompt.includes(tag.replace(/-/g, " ")),
  );
  const score = 1 + matchedSignals.length * 4 + tagSignals.length * 2 - negativeSignals.length * 5;

  const selectedVariant = selectVariant(module, normalizedPrompt);

  return {
    module,
    score,
    matchedSignals: [...new Set([...matchedSignals, ...tagSignals, ...selectedVariant.matchedSignals])],
    selectedVariantId: selectedVariant.id,
  };
}

function fallbackCandidates(catalog: ModuleDefinition[], deviceType: DeviceType): ModuleCandidate[] {
  return catalog
    .filter((module) => supportsDevice(module, deviceType))
    .map((module, index) => ({
      module,
      score: 1 / (index + 1),
      matchedSignals: [],
      selectedVariantId: module.variants[0].id,
    }));
}

function supportsDevice(module: ModuleDefinition, deviceType: DeviceType): boolean {
  return module.deviceSupport.includes(deviceType) || module.deviceSupport.includes("agnostic");
}

function selectVariant(
  module: ModuleDefinition,
  normalizedPrompt: string,
): { id: string; matchedSignals: string[] } {
  const scoredVariants = module.variants
    .map((variant) => {
      const matchedSignals = variant.promptSignals.filter((signal) =>
        normalizedPrompt.includes(signal.toLowerCase()),
      );

      return {
        id: variant.id,
        density: variant.density,
        matchedSignals,
        score: matchedSignals.length,
      };
    })
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.id.localeCompare(right.id),
    );
  if (scoredVariants[0]?.score > 0) {
    return {
      id: scoredVariants[0].id,
      matchedSignals: scoredVariants[0].matchedSignals,
    };
  }

  if (normalizedPrompt.includes("dense") || normalizedPrompt.includes("compact")) {
    return {
      id: module.variants.find((variant) => variant.density === "compact")?.id ?? module.variants[0].id,
      matchedSignals: [],
    };
  }
  if (normalizedPrompt.includes("spacious") || normalizedPrompt.includes("marketing")) {
    return {
      id: module.variants.find((variant) => variant.density === "spacious")?.id ?? module.variants[0].id,
      matchedSignals: [],
    };
  }

  return {
    id: module.variants.find((variant) => variant.density === "comfortable")?.id ?? module.variants[0].id,
    matchedSignals: [],
  };
}

function diversifyFamilies(
  candidates: ModuleCandidate[],
  maxModules: number,
): ModuleCandidate[] {
  const selected: ModuleCandidate[] = [];
  const usedFamilies = new Set<string>();

  for (const candidate of candidates) {
    if (selected.length >= maxModules) return selected;
    if (usedFamilies.has(candidate.module.family)) continue;

    selected.push(candidate);
    usedFamilies.add(candidate.module.family);
  }

  for (const candidate of candidates) {
    if (selected.length >= maxModules) return selected;
    if (selected.some((selectedCandidate) => selectedCandidate.module.id === candidate.module.id)) {
      continue;
    }
    selected.push(candidate);
  }

  return selected;
}

function compareCandidates(left: ModuleCandidate, right: ModuleCandidate): number {
  return (
    right.score - left.score ||
    left.module.family.localeCompare(right.module.family) ||
    left.module.id.localeCompare(right.module.id)
  );
}
