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
import PlaybackControls from "@/components/PlaybackControls";

import { useAudioProcessor } from "@/hooks/useAudioProcessor";

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

  const [showAddFrequency, setShowAddFrequency] = useState(false);
  const [showPresetManager, setShowPresetManager] = useState(false);
  const [showModeSelector, setShowModeSelector] = useState(false);

  // Extracted audio processing logic
  const {
    audioFile,
    audioData,
    outputData,
    audioContextRef,
    handleFileUpload,
    handleExport,
    processAudio,
    resetOutput,
  } = useAudioProcessor();

  // Default frequencies for generic mode
  const defaultFrequencies = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
  const defaultRanges: FrequencyRange[] = defaultFrequencies.map((freq) => ({
    minFreq: freq,
    maxFreq: freq,
    gain: 1,
  }));

  const [frequencyRanges, setFrequencyRanges] = useState<FrequencyRange[]>(defaultRanges);
  const [sliderValues, setSliderValues] = useState<number[]>(
    mode === "generic" ? defaultRanges.map((r) => r.gain) : Array(8).fill(1)
  );

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

  const formatFrequency = (freq: number) =>
    freq >= 1000
      ? `${(freq / 1000).toFixed(freq % 1000 === 0 ? 0 : 1)}kHz`
      : `${freq}Hz`;

  const getModeConfig = () => {
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
  };

  const config = getModeConfig();

  const handleModeChange = (newMode: string) => {
    setMode(newMode);
    if (newMode === "generic") {
      setFrequencyRanges(defaultRanges);
      setSliderValues(defaultRanges.map((r) => r.gain));
    } else {
      setSliderValues(Array(8).fill(1));
    }
    resetOutput();
  };

  const handleSliderChange = (index: number, value: number[]) => {
    const newValues = [...sliderValues];
    newValues[index] = value[0];
    setSliderValues(newValues);

    processAudio((input) => {
      const processed = new Float32Array(input.length);
      for (let i = 0; i < input.length; i++) {
        const bandIndex = Math.floor((i / input.length) * newValues.length);
        processed[i] = input[i] * newValues[bandIndex];
      }
      return processed;
    });
  };

  const handleReset = () => {
    if (mode === "generic") {
      setFrequencyRanges(defaultRanges);
      setSliderValues(defaultRanges.map((r) => r.gain));
    } else {
      setSliderValues(Array(sliderValues.length).fill(1));
    }
    resetOutput();
    toast.success("Settings reset");
  };

  const handleAddFrequency = (range: FrequencyRange) => {
    const newRanges = [...frequencyRanges, range].sort((a, b) => a.minFreq - b.minFreq);
    setFrequencyRanges(newRanges);
    setSliderValues(newRanges.map((r) => r.gain));
  };

  const handleLoadPreset = (preset: EqualizerPreset) => {
    const ranges: FrequencyRange[] = [];
    for (let i = 0; i < preset.frequencies.length; i++) {
      const minFreq = i === 0 ? 20 : preset.frequencies[i - 1];
      ranges.push({ minFreq, maxFreq: preset.frequencies[i], gain: preset.gains[i] });
    }
    setFrequencyRanges(ranges);
    setSliderValues(preset.gains);

    processAudio((input) => {
      const processed = new Float32Array(input.length);
      for (let i = 0; i < input.length; i++) {
        const bandIndex = Math.floor((i / input.length) * preset.gains.length);
        processed[i] = input[i] * preset.gains[bandIndex];
      }
      return processed;
    });
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
    <EqualizerControls labels={config.sliders} values={sliderValues} onChange={handleSliderChange} />
  );

  const renderAudioSourceSeparation = (separationMode: "musical" | "human") => (
    <AudioSourceSeparation
      mode={separationMode}
      sources={separationMode === "musical" ? musicalSources : humanSources}
      onVolumeChange={separationMode === "musical" ? handleMusicalVolumeChange : handleHumanVolumeChange}
      onMuteToggle={separationMode === "musical" ? handleMusicalMuteToggle : handleHumanMuteToggle}
      audioData={outputData}
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
        {renderAudioSourceSeparation(separationMode)}
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
            <PlaybackControls
              showSpectrograms={showSpectrograms}
              audioContextRef={audioContextRef}
              outputData={outputData}
              onResetZoom={() => setZoom(1)}
              onResetPan={() => setPan(0)}
            />
            <SignalViewer
              title="Input Signal"
              data={audioData}
              color="cyan"
              zoom={zoom}
              pan={pan}
              onZoomChange={setZoom}
              onPanChange={setPan}
              renderProps={{ sampleRate: audioContextRef.current?.sampleRate || 44100 }}
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
              title="Input Signal FFT" 
              color="cyan" 
              audioData={audioData}
              sampleRate={audioContextRef.current?.sampleRate || 44100}
            />
            <FFTViewer 
              title="Output Signal FFT" 
              color="magenta" 
              audioData={outputData}
              sampleRate={audioContextRef.current?.sampleRate || 44100}
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
              <Spectrogram title="Input Spectrogram" data={audioData} color="cyan" />
              <Spectrogram title="Output Spectrogram" data={outputData} color="magenta" />
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
        currentFrequencies={frequencyRanges.map((r) => r.maxFreq)}
        currentGains={sliderValues}
        onLoad={handleLoadPreset}
      />
    </div>
  );
};

export default Equalizer;