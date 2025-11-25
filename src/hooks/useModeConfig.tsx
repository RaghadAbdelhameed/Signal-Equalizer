import { useMemo } from "react";
import modesData from "@/modes.json";

interface FrequencyRange {
  minFreq: number;
  maxFreq: number;
  gain: number;
}

interface ModeConfig {
  title: string;
  sliders: string[];
  isGeneric: boolean;
  isAI: boolean;
}

export const useModeConfig = (mode: string, frequencyRanges: FrequencyRange[]): ModeConfig => {
  return useMemo(() => {
    // Fixed modes – use labels from JSON
    if (["music", "animals", "voices"].includes(mode)) {
      const data = (modesData as any)[mode];
      return {
        title: data.title,
        sliders: data.ranges.map((r: any) => r.label),
        isGeneric: false,
        isAI: false,
      };
    }

    // AI modes
    if (mode === "ai-musical") return { title: "AI Musical Separation", sliders: [], isGeneric: false, isAI: true };
    if (mode === "ai-human") return { title: "AI Speaker Separation", sliders: [], isGeneric: false, isAI: true };

    // Generic mode – ONLY here we calculate frequency labels
    const formatFrequency = (freq: number) =>
      freq >= 1000 ? `${(freq / 1000).toFixed(1)}kHz` : `${freq}Hz`;

    const genericLabels = frequencyRanges.length > 0
      ? frequencyRanges.map(r =>
          formatFrequency(Math.round((r.minFreq + r.maxFreq) / 2))
        )
      : []; // ← important: fallback when ranges are empty

    return {
      title: "Generic Mode",
      sliders: genericLabels,
      isGeneric: true,
      isAI: false,
    };
  }, [mode, frequencyRanges]); // ← frequencyRanges is a dependency
};