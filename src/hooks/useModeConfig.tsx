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
    console.log("🔄 useModeConfig called with mode:", mode);

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

    // Check for AI modes
    if (mode === "ai-musical" || mode === "ai-human") {
      const title = mode === "ai-musical" ? "AI Music Separation" : "AI Speech Separation";
      return {
        title,
        sliders: [],
        isGeneric: false,
        isAI: true,
      };
    }

    // Generic mode – calculate frequency labels
    const formatFrequency = (freq: number) =>
      freq >= 1000 ? `${(freq / 1000).toFixed(1)}kHz` : `${freq}Hz`;

    const genericLabels = frequencyRanges.length > 0
      ? frequencyRanges.map(r =>
          formatFrequency(Math.round((r.minFreq + r.maxFreq) / 2))
        )
      : [];

    return {
      title: "Generic Mode",
      sliders: genericLabels,
      isGeneric: true,
      isAI: false,
    };
  }, [mode, frequencyRanges]);
};