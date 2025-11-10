// src/hooks/useModeConfig.ts
import { useMemo } from "react";

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
  const formatFrequency = (freq: number) =>
    freq >= 1000
      ? `${(freq / 1000).toFixed(freq % 1000 === 0 ? 0 : 1)}kHz`
      : `${freq}Hz`;

  return useMemo(() => {
    switch (mode) {
      case "music":
        return {
          title: "Musical Instruments Mode",
          sliders: ["Guitar", "Piano", "Drums", "Bass", "Violin", "Saxophone", "Trumpet", "Vocals"],
          isGeneric: false,
          isAI: false,
        };
      case "animals":
        return {
          title: "Animal Sounds Mode",
          sliders: ["Dog", "Cat", "Bird", "Lion", "Elephant", "Whale", "Frog", "Cricket"],
          isGeneric: false,
          isAI: false,
        };
      case "voices":
        return {
          title: "Human Voices Mode",
          sliders: ["Male 1", "Female 1", "Male 2", "Female 2", "Child 1", "Elder 1", "Child 2", "Elder 2"],
          isGeneric: false,
          isAI: false,
        };
      case "ai-musical":
        return { title: "AI Musical Separation", sliders: [], isGeneric: false, isAI: true };
      case "ai-human":
        return { title: "AI Speaker Separation", sliders: [], isGeneric: false, isAI: true };
      default:
        return {
          title: "Generic Mode",
          sliders: frequencyRanges.map((r) => formatFrequency(r.minFreq)),
          isGeneric: true,
          isAI: false,
        };
    }
  }, [mode, frequencyRanges]);
};