import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Home,
  Upload,
  Download,
  Settings,
  Plus,
  RotateCcw,
  Save,
} from "lucide-react";
import { toast } from "sonner";

import SignalViewer from "@/components/SignalViewer";
import Spectrogram from "@/components/Spectrogram";
import FFTViewer from "@/components/FFTViewer";
import EqualizerControls from "@/components/EqualizerControls";
import AddFrequencyDialog from "@/components/AddFrequencyDialog";
import PresetManager, { EqualizerPreset } from "@/components/PresetManager";
import ModeSelectorDialog from "@/components/ModeSelectorDialog";
import { AudioSourceSeparation } from "@/components/AudioSourceSeparation";

import { useAudioProcessor } from "@/hooks/useAudioProcessor";
import { useModeConfig } from "@/hooks/useModeConfig";

interface FrequencyRange {
  minFreq: number;
  maxFreq: number;
  gain: number;
}

const Equalizer = () => {
  const { mode: urlMode } = useParams<{ mode: string }>();
  const navigate = useNavigate();

  const [mode, setMode] = useState(urlMode || "generic");
  const [subMode, setSubMode] = useState<"equalizer" | "ai">("equalizer");
  const [showSpectrograms, setShowSpectrograms] = useState(true);
  const [useAudiogramScale, setUseAudiogramScale] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);

  const [showAddFrequency, setShowAddFrequency] = useState(false);
  const [showPresetManager, setShowPresetManager] = useState(false);
  const [showModeSelector, setShowModeSelector] = useState(false);

  // Extracted audio processing logic
  const {
    audioFile,
    audioData,
    outputData,
    inputFFT,
    outputFFT,
    inputSlices,
    outputSlices,
    isPlaying,
    setPlaybackTimeListener,
    audioContextRef,
    handleFileUpload,
    handleExport,
    processAudio,
    resetOutput,
  } = useAudioProcessor();

  // Default frequencies for generic mode
  const defaultFrequencies = [250, 1000, 16000];
  const defaultRanges: FrequencyRange[] = defaultFrequencies.map((freq, index) => {

    return {
      minFreq: freq - 32,
      maxFreq: freq + 32,
      gain: 1,
    };
  });

  const [frequencyRanges, setFrequencyRanges] = useState<FrequencyRange[]>(defaultRanges);
  const [sliderValues, setSliderValues] = useState<number[]>(
    mode === "generic" ? defaultRanges.map((r) => r.gain) : Array(8).fill(1)
  );

  // Add processTrigger state
  const [processTrigger, setProcessTrigger] = useState(0);

  // AI Source Separation States
  const [musicalSources, setMusicalSources] = useState([
    { id: "vocals", name: "Vocals", volume: 1, muted: false, color: "#ec4899" },
    { id: "piano", name: "Piano", volume: 1, muted: false, color: "#8b5cf6" },
    { id: "guitar", name: "Guitar", volume: 1, muted: false, color: "#f59e0b" },
    { id: "bass", name: "Bass", volume: 1, muted: false, color: "#10b981" },
    { id: "drums", name: "Drums", volume: 1, muted: false, color: "#3b82f6" },
    { id: "others", name: "Others", volume: 1, muted: false, color: "#6366f1" },
  ]);

  const [humanSources, setHumanSources] = useState([
    { id: "speaker1", name: "Speaker 1", volume: 1, muted: false, color: "#ec4899" },
    { id: "speaker2", name: "Speaker 2", volume: 1, muted: false, color: "#8b5cf6" },
    { id: "speaker3", name: "Speaker 3", volume: 1, muted: false, color: "#f59e0b" },
    { id: "speaker4", name: "Speaker 4", volume: 1, muted: false, color: "#10b981" },
  ]);

  // Sync URL mode
  useEffect(() => {
    if (urlMode && urlMode !== mode) {
      setMode(urlMode);
    }
  }, [urlMode]);

  // Debug effect
  useEffect(() => {
    console.log("=== FREQUENCY RANGES DEBUG ===");
    console.log("Current frequencyRanges:", frequencyRanges);
    console.log("Current sliderValues:", sliderValues);

    // Check for duplicates
    const centers = frequencyRanges.map(r => Math.round((r.minFreq + r.maxFreq) / 2));
    const duplicates = centers.filter((item, index) => centers.indexOf(item) !== index);

    if (duplicates.length > 0) {
      console.warn("DUPLICATE CENTER FREQUENCIES FOUND:", duplicates);
    }

    // Check for overlaps
    for (let i = 0; i < frequencyRanges.length - 1; i++) {
      if (frequencyRanges[i].maxFreq > frequencyRanges[i + 1].minFreq) {
        console.warn(`OVERLAP DETECTED: Range ${i} max (${frequencyRanges[i].maxFreq}) > Range ${i + 1} min (${frequencyRanges[i + 1].minFreq})`);
      }
    }
  }, [frequencyRanges]);

  const config = useModeConfig(mode, frequencyRanges);

  const handleModeChange = (newMode: string) => {
    setMode(newMode);
    if (newMode === "generic") {
      setFrequencyRanges(defaultRanges);
      setSliderValues(defaultRanges.map((r) => r.gain));
    } else {
      setSliderValues(Array(8).fill(1));
    }
    setProcessTrigger(prev => prev + 1);
    resetOutput();
  };

  const getGainControls = (sampleRate: number): [number, number, number][] => {
    const nyquist = sampleRate / 2;
    const maxFreqCap = Math.min(20000, nyquist);

    console.log("=== GET GAIN CONTROLS ===");
    console.log("Frequency ranges:", frequencyRanges);

    // Always use predefined ranges (sorted). Sliders are only UI labels now.
    const sortedRanges = [...frequencyRanges].sort((a, b) => a.minFreq - b.minFreq);

    return sortedRanges.map((range, index) => {
      const control: [number, number, number] = [
        range.minFreq,
        Math.min(range.maxFreq, maxFreqCap),
        range.gain
      ];
      console.log(`Range ${index}: ${control[0]}Hz - ${control[1]}Hz, gain: ${control[2]}`);
      return control;
    });
  };

useEffect(() => {
  if (setPlaybackTimeListener) {
    setPlaybackTimeListener((time: number) => {
      setCurrentTime(time);
    });
  }
}, [setPlaybackTimeListener]);

  // Processing effect
  useEffect(() => {
    console.log("🔄 Processing triggered. State:", {
      sliderValues,
      frequencyRanges: frequencyRanges.length,
      audioData: !!audioData,
      mode,
      subMode,
      isAI: config.isAI
    });

    if (audioData && !config.isAI && subMode === "equalizer") {
      const sampleRate = audioContextRef.current?.sampleRate || 44100;
      const rangeControls = getGainControls(sampleRate);
      console.log("🎵 Calling processAudio with range controls:", rangeControls);
      processAudio(rangeControls);
    } else {
      console.log("⏭️ Skipping processing - conditions not met");
    }
  }, [processTrigger, audioData, config.isAI, subMode, mode]);

  // Simple validation function
  const validateAndFixRanges = (ranges: FrequencyRange[]): FrequencyRange[] => {
    // 1. Sort ranges by their midpoint frequency
    const sorted = [...ranges].sort(
      (a, b) => ((a.minFreq + a.maxFreq) / 2) - ((b.minFreq + b.maxFreq) / 2)
    );

    // 2. Ensure unique midpoints
    for (let i = 1; i < sorted.length; i++) {
      const prevMid = (sorted[i - 1].minFreq + sorted[i - 1].maxFreq) / 2;
      const currMid = (sorted[i].minFreq + sorted[i].maxFreq) / 2;

      if (currMid <= prevMid) {
        const newMid = prevMid + 1; // Increase midpoint by 1 Hz

        console.warn(
          `Adjusted midpoint at index ${i}. Old midpoint: ${currMid}, New midpoint: ${newMid}`
        );

      }
    }

    console.log("✔ Final ranges (midpoint sorted & unique):", sorted);
    return sorted;
  };



  // CORRECTED handleAddFrequency - FIXED DUPLICATION ISSUE
  const handleAddFrequency = (newRange: FrequencyRange) => {
    console.log("➕ Adding new frequency range:", newRange);

    // Round the frequencies to avoid floating point issues
    const roundedRange = {
      minFreq: Math.round(newRange.minFreq),
      maxFreq: Math.round(newRange.maxFreq),
      gain: newRange.gain
    };

    console.log("Rounded range:", roundedRange);

    // Create a copy of current ranges and add the new one
    const newRanges = [...frequencyRanges, roundedRange];

    // Validate and fix any issues
    const validatedRanges = validateAndFixRanges(newRanges);

    // Check if we actually added a new range (not a duplicate)
    if (validatedRanges.length === frequencyRanges.length) {
      console.warn("No new range added - likely a duplicate");
      toast.error("Frequency range already exists or is too close to existing range");
      return;
    }

    console.log("New ranges: ", validatedRanges)
    setFrequencyRanges(validatedRanges);
    setSliderValues(validatedRanges.map((r) => r.gain));
    setProcessTrigger(prev => prev + 1);

    toast.success("Frequency range added");
  };

  // handleSliderChange
  const handleSliderChange = (index: number, value: number[]) => {
    console.log(`🎚️ Slider ${index} changed to:`, value[0]);
    const newValues = [...sliderValues];
    newValues[index] = value[0];
    setSliderValues(newValues);

    // Also update frequencyRanges in generic mode
    if (config.isGeneric) {
      const newRanges = [...frequencyRanges];
      newRanges[index].gain = value[0];
      setFrequencyRanges(newRanges);
    }

    // Trigger processing
    setProcessTrigger(prev => prev + 1);
  };

  const handleReset = () => {
    if (mode === "generic") {
      setFrequencyRanges(defaultRanges);
      setSliderValues(defaultRanges.map((r) => r.gain));
    } else {
      setSliderValues(Array(sliderValues.length).fill(1));
    }
    setProcessTrigger(prev => prev + 1);
    resetOutput();
    toast.success("Settings reset");
  };

  const handleRemoveFrequency = (index: number) => {
    if (frequencyRanges.length <= 2) {
      toast.error("Cannot remove frequency - minimum 2 points required");
      return;
    }

    const newRanges = frequencyRanges.filter((_, i) => i !== index);

    // Recalculate boundaries using simple validation
    const validatedRanges = validateAndFixRanges(newRanges);

    setFrequencyRanges(validatedRanges);
    setSliderValues(validatedRanges.map((r) => r.gain));
    setProcessTrigger(prev => prev + 1);

    toast.success("Frequency point removed");
  };

  const handleLoadPreset = (preset: EqualizerPreset) => {
    if (config.isGeneric && preset.frequencies && preset.gains) {
      // For generic mode, create ranges from preset frequencies
      const ranges: FrequencyRange[] = [];
      for (let i = 0; i < preset.frequencies.length; i++) {
        const minFreq = i === 0 ? 20 : (preset.frequencies[i - 1] + preset.frequencies[i]) / 2;
        const maxFreq = i === preset.frequencies.length - 1 ? 20000 : (preset.frequencies[i] + preset.frequencies[i + 1]) / 2;
        ranges.push({
          minFreq: Math.round(minFreq),
          maxFreq: Math.round(maxFreq),
          gain: preset.gains[i]
        });
      }
      setFrequencyRanges(ranges);
      setSliderValues(preset.gains);
    } else {
      // For fixed modes, just set the gains
      setSliderValues(preset.gains || Array(sliderValues.length).fill(1));
    }
    setProcessTrigger(prev => prev + 1);
    toast.success("Preset loaded");
  };

  const handleMusicalVolumeChange = (id: string, volume: number) => {
    setMusicalSources((prev) =>
      prev.map((s) => (s.id === id ? { ...s, volume } : s))
    );
  };

  const handleMusicalMuteToggle = (id: string) => {
    setMusicalSources((prev) =>
      prev.map((s) => (s.id === id ? { ...s, muted: !s.muted } : s))
    );
  };

  const handleHumanVolumeChange = (id: string, volume: number) => {
    setHumanSources((prev) =>
      prev.map((s) => (s.id === id ? { ...s, volume } : s))
    );
  };

  const handleHumanMuteToggle = (id: string) => {
    setHumanSources((prev) =>
      prev.map((s) => (s.id === id ? { ...s, muted: !s.muted } : s))
    );
  };

  const renderEqualizerHeader = (showAddButton: boolean) => (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold">Equalizer Controls</h3>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={handleReset}>
          <RotateCcw className="h-3 w-3 mr-1.5" />
          Reset
        </Button>
        {showAddButton && (
          <Button variant="outline" size="sm" onClick={() => setShowAddFrequency(true)}>
            <Plus className="h-3 w-3 mr-1.5" />
            Add Frequency
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={() => setShowPresetManager(true)}>
          <Save className="h-3 w-3 mr-1.5" />
          Presets
        </Button>
      </div>
    </div>
  );

  const renderEqualizerControls = () => (
    <EqualizerControls
      labels={config.sliders}
      values={sliderValues}
      onChange={handleSliderChange}
      onRemove={config.isGeneric ? handleRemoveFrequency : undefined}
    />
  );

  const renderAudioSourceSeparation = (separationMode: "musical" | "human") => (
    <AudioSourceSeparation
      mode={separationMode}
      sources={separationMode === "musical" ? musicalSources : humanSources}
      onVolumeChange={separationMode === "musical" ? handleMusicalVolumeChange : handleHumanVolumeChange}
      onMuteToggle={separationMode === "musical" ? handleMusicalMuteToggle : handleHumanMuteToggle}
      audioData={outputData}
      audioContextRef={audioContextRef}
      currentTime={currentTime}
      onCurrentTimeChange={setCurrentTime}
      playbackSpeed={playbackSpeed}
      onPlaybackSpeedChange={setPlaybackSpeed}
    />
  );

  let mainControls;
  if (mode === "music" || mode === "voices") {
    const separationMode = mode === "music" ? "musical" : "human";
    mainControls = (
      <Card className="p-6 bg-card border-border">
        <Tabs value={subMode} onValueChange={(v) => setSubMode(v as "equalizer" | "ai")}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="equalizer">Equalizer Mode</TabsTrigger>
            <TabsTrigger value="ai">AI Separation</TabsTrigger>
          </TabsList>
          <TabsContent value="equalizer">
            {renderEqualizerHeader(false)}
            {renderEqualizerControls()}
          </TabsContent>
          <TabsContent value="ai">
            {renderAudioSourceSeparation(separationMode)}
          </TabsContent>
        </Tabs>
      </Card>
    );
  } else if (config.isAI) {
    const separationMode = mode === "ai-musical" ? "musical" : "human";
    mainControls = (
      <Card className="p-6 bg-card border-border">
        <AudioSourceSeparation
          mode={separationMode}
          sources={separationMode === "musical" ? musicalSources : humanSources}
          onVolumeChange={separationMode === "musical" ? handleMusicalVolumeChange : handleHumanVolumeChange}
          onMuteToggle={separationMode === "musical" ? handleMusicalMuteToggle : handleHumanMuteToggle}
          audioData={outputData}
          audioContextRef={audioContextRef}
          currentTime={currentTime}
          onCurrentTimeChange={setCurrentTime}
          playbackSpeed={playbackSpeed}
          onPlaybackSpeedChange={setPlaybackSpeed}
        />
      </Card>
    );
  } else {
    mainControls = (
      <Card className="p-6 bg-card border-border">
        {renderEqualizerHeader(config.isGeneric)}
        {renderEqualizerControls()}
      </Card>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="hover:bg-primary/10">
                <Home className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  {config.title}
                </h1>
                <p className="text-xs text-muted-foreground">
                  {audioFile ? audioFile.name : "No file loaded"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowModeSelector(true)}>
                <Settings className="h-4 w-4 mr-2" />
                Change Mode
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => document.getElementById("audio-upload")?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </Button>
              <input
                id="audio-upload"
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={handleFileUpload}
              />
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {mainControls}
          <div className="flex flex-col gap-4">
            <SignalViewer
              title="Input Signal"
              data={audioData}
              color="cyan"
              zoom={zoom}
              pan={pan}
              onZoomChange={setZoom}
              onPanChange={setPan}
              renderProps={{ sampleRate: audioContextRef.current?.sampleRate || 44100 }}
              audioContextRef={audioContextRef}
              currentTime={currentTime}
              onCurrentTimeChange={setCurrentTime}
              playbackSpeed={playbackSpeed}
              onPlaybackSpeedChange={setPlaybackSpeed}
            />

            <SignalViewer
              title="Output Signal"
              data={outputData}
              color="magenta"
              zoom={zoom}
              pan={pan}
              onZoomChange={setZoom}
              onPanChange={setPan}
              renderProps={{ sampleRate: audioContextRef.current?.sampleRate || 44100 }}
              audioContextRef={audioContextRef}
              currentTime={currentTime}
              onCurrentTimeChange={setCurrentTime}
              playbackSpeed={playbackSpeed}
              onPlaybackSpeedChange={setPlaybackSpeed}
            />
          </div>
        </div>

        {/* FFT Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between mx-4">
            <h2 className="text-lg font-semibold">Frequency Spectrum (FFT)</h2>
            <div className="flex items-center gap-2 ml-auto">
              <Switch
                checked={useAudiogramScale}
                onCheckedChange={setUseAudiogramScale}
                id="audiogram-scale"
              />
              <Label htmlFor="audiogram-scale" className="text-sm cursor-pointer whitespace-nowrap">
                Audiogram
              </Label>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <FFTViewer
              title="Input Signal"
              color="cyan"
              fftData={inputFFT}
              zoom={zoom}
              pan={pan}
              onZoomChange={setZoom}
              onPanChange={setPan}
              sampleRate={audioContextRef.current?.sampleRate || 44100}
              useAudiogramScale={useAudiogramScale}
            />
            <FFTViewer
              title="Output Signal"
              color="magenta"
              fftData={outputFFT}
              zoom={zoom}
              pan={pan}
              onZoomChange={setZoom}
              onPanChange={setPan}
              sampleRate={audioContextRef.current?.sampleRate || 44100}
              useAudiogramScale={useAudiogramScale}
            />
          </div>
        </div>

        {/* Spectrograms Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between mx-4">
            <h2 className="text-lg font-semibold">Spectrograms</h2>
            <div className="flex items-center gap-2">
              <Switch
                checked={showSpectrograms}
                onCheckedChange={setShowSpectrograms}
                id="show-spectrograms-global"
              />
              <Label htmlFor="show-spectrograms-global" className="text-sm cursor-pointer">
                Show Spectrograms
              </Label>
            </div>
          </div>

          {showSpectrograms && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fade-in">
              <Spectrogram
                title="Input Spectrogram"
                stftSlices={inputSlices}
                currentTime={currentTime}
                duration={audioData ? audioData.length / (audioContextRef.current?.sampleRate || 44100) : undefined}
                sampleRate={audioContextRef.current?.sampleRate}
                color="cyan"
              />
              <Spectrogram
                title="Output Spectrogram"
                stftSlices={outputSlices}
                currentTime={currentTime}
                duration={outputData ? outputData.length / (audioContextRef.current?.sampleRate || 44100) : undefined}
                sampleRate={audioContextRef.current?.sampleRate}
                color="magenta"
              />
            </div>
          )}
        </div>
      </main>

      {/* Dialogs */}
      <ModeSelectorDialog
        open={showModeSelector}
        onOpenChange={setShowModeSelector}
        onSelectMode={handleModeChange}
        currentMode={mode}
      />

      {config.isGeneric && (
        <AddFrequencyDialog
          open={showAddFrequency}
          onOpenChange={setShowAddFrequency}
          onAdd={handleAddFrequency}
          existingRanges={frequencyRanges}
        />
      )}

      <PresetManager
        open={showPresetManager}
        onOpenChange={setShowPresetManager}
        currentFrequencies={frequencyRanges.map((r) => Math.round((r.minFreq + r.maxFreq) / 2))}
        currentGains={sliderValues}
        onLoad={handleLoadPreset}
      />
    </div>
  );
};

export default Equalizer;