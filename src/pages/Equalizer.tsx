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
import modesData from "@/modes.json";

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
  const defaultGenericRanges: FrequencyRange[] = [
    { minFreq: 20, maxFreq: 200, gain: 1 },
    { minFreq: 500, maxFreq: 1000, gain: 1 },
    { minFreq: 2000, maxFreq: 5000, gain: 1 },
    { minFreq: 8000, maxFreq: 12000, gain: 1 },
  ];

  const [frequencyRanges, setFrequencyRanges] = useState<FrequencyRange[]>(defaultGenericRanges);
  const [sliderValues, setSliderValues] = useState<number[]>(defaultGenericRanges.map(r => r.gain));

  // Add processTrigger state
  const [processTrigger, setProcessTrigger] = useState(0);

  // Sync URL mode
  useEffect(() => {
    if (urlMode && urlMode !== mode) {
      setMode(urlMode);
    }
  }, [urlMode]);

  // Load correct frequency ranges when mode changes
  useEffect(() => {
    if (mode === "generic") {
      setFrequencyRanges(defaultGenericRanges);
      setSliderValues(defaultGenericRanges.map(r => r.gain));
    } else if (["music", "animals", "voices"].includes(mode)) {
      const data = (modesData as any)[mode];
      const ranges = data.ranges.map((r: any) => ({
        minFreq: r.minFreq,
        maxFreq: r.maxFreq,
        gain: r.gain || 1
      }));
      setFrequencyRanges(ranges);
      setSliderValues(ranges.map((r: any) => r.gain || 1));
    } else {
      // AI modes
      setFrequencyRanges([]);
      setSliderValues([]);
    }

    // Reset processing
    setProcessTrigger(prev => prev + 1);
    resetOutput();
  }, [mode]);

  const config = useModeConfig(mode, frequencyRanges);

  const handleModeChange = (newMode: string) => {
    setMode(newMode);
    setSubMode("equalizer");
    navigate(`/equalizer/${newMode}`);
  };

  const getGainControls = (sampleRate: number): [number, number, number][] => {
    const nyquist = sampleRate / 2;
    const maxFreqCap = Math.min(20000, nyquist);

    const sortedRanges = [...frequencyRanges].sort((a, b) => a.minFreq - b.minFreq);

    return sortedRanges.map((range) => {
      const control: [number, number, number] = [
        range.minFreq,
        Math.min(range.maxFreq, maxFreqCap),
        range.gain
      ];
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

  // Processing effect - SKIP PROCESSING IN AI MODES
  useEffect(() => {
    if (audioData && !config.isAI && subMode === "equalizer") {
      const sampleRate = audioContextRef.current?.sampleRate || 44100;
      const rangeControls = getGainControls(sampleRate);
      processAudio(rangeControls);
    }
  }, [processTrigger, audioData, config.isAI, subMode, mode]);

  const handleAddFrequency = (newRange: FrequencyRange) => {
    const roundedRange = {
      minFreq: Math.round(newRange.minFreq),
      maxFreq: Math.round(newRange.maxFreq),
      gain: newRange.gain
    };

    const newRanges = [...frequencyRanges, roundedRange];
    setFrequencyRanges(newRanges);
    setSliderValues(newRanges.map((r) => r.gain));
    setProcessTrigger(prev => prev + 1);
    toast.success("Frequency range added");
  };

  const handleSliderChange = (index: number, value: number[]) => {
    const newValues = [...sliderValues];
    newValues[index] = value[0];
    setSliderValues(newValues);

    const newRanges = [...frequencyRanges];
    if (newRanges[index]) {
      newRanges[index].gain = value[0];
      setFrequencyRanges(newRanges);
    }

    setProcessTrigger(prev => prev + 1);
  };

  const handleReset = () => {
    if (mode === "generic") {
      setFrequencyRanges(defaultGenericRanges);
      setSliderValues(defaultGenericRanges.map(r => r.gain));
    } else if (["music", "animals", "voices"].includes(mode)) {
      const data = (modesData as any)[mode];
      const ranges = data.ranges.map((r: any) => ({
        minFreq: r.minFreq,
        maxFreq: r.maxFreq,
        gain: r.gain || 1
      }));
      setFrequencyRanges(ranges);
      setSliderValues(ranges.map((r: any) => r.gain || 1));
    } else {
      setSliderValues([]);
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
    setFrequencyRanges(newRanges);
    setSliderValues(newRanges.map((r) => r.gain));
    setProcessTrigger(prev => prev + 1);
    toast.success("Frequency point removed");
  };

  const handleLoadPreset = (preset: EqualizerPreset) => {
    setFrequencyRanges(preset.ranges);
    setSliderValues(preset.ranges.map(r => r.gain));
    setProcessTrigger(prev => prev + 1);
    toast.success(`Loaded: ${preset.name}`);
  };

  const renderEqualizerHeader = (showAddButton: boolean) => (
    <div className="flex items-center justify-between">
      <h3 className="text-lg font-semibold">Equalizer Controls</h3>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={handleReset} title="Reset">
          <RotateCcw className="h-4 w-4" />
        </Button>
        {showAddButton && (
          <Button variant="outline" size="icon" onClick={() => setShowAddFrequency(true)} title="Add Frequency">
            <Plus className="h-4 w-4" />
          </Button>
        )}
        <Button variant="outline" size="icon" onClick={() => setShowPresetManager(true)} title="Presets">
          <Save className="h-4 w-4" />
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
      audioData={outputData}
      audioContextRef={audioContextRef}
      currentTime={currentTime}
      onCurrentTimeChange={setCurrentTime}
      playbackSpeed={playbackSpeed}
      onPlaybackSpeedChange={setPlaybackSpeed}
      audioFile={audioFile}
    />
  );

  // Check if we're in AI mode (either pure AI mode or AI tab)
  const isAIMode = config.isAI || subMode === "ai";

  // Main controls logic
  let mainControls;

  if (config.isAI) {
    // Pure AI modes (ai-musical, ai-human)
    const separationMode = mode === "ai-musical" ? "musical" : "human";
    
    mainControls = (
      <Card className="p-6 bg-card border-border flex flex-col">
        <div className="min-h-0">
          {renderAudioSourceSeparation(separationMode)}
        </div>
      </Card>
    );
  } else if (mode === "music" || mode === "voices") {
    // Modes with AI tabs
    const separationMode = mode === "music" ? "musical" : "human";
    
    mainControls = (
      <Card className="p-6 bg-card border-border">
        <Tabs value={subMode} onValueChange={(v) => setSubMode(v as "equalizer" | "ai")}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="equalizer">Equalizer Mode</TabsTrigger>
            <TabsTrigger value="ai">AI Separation</TabsTrigger>
          </TabsList>
          <TabsContent value="equalizer" className="mt-4">
            {renderEqualizerHeader(false)}
            <div className="mt-4">{renderEqualizerControls()}</div>
          </TabsContent>
          <TabsContent value="ai" className="mt-2">
            <div className="flex flex-col">
              {renderAudioSourceSeparation(separationMode)}
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    );
  } else {
    // Generic and animal modes
    mainControls = (
      <Card className="p-6 bg-card border-border">
        {renderEqualizerHeader(config.isGeneric)}
        <div className="mt-4">{renderEqualizerControls()}</div>
      </Card>
    );
  }

  // Render visualizations only in NON-AI modes
  const renderVisualizations = () => {
    if (isAIMode) {
      return (
        <div className="space-y-8">
          {/* Simple file info card for AI mode */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">AI Separation Mode</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Current File</h3>
                <p className="text-sm text-muted-foreground">
                  {audioFile ? audioFile.name : "No file loaded"}
                </p>
              </div>
              <div>
                <h3 className="font-medium mb-2">Mode</h3>
                <p className="text-sm text-muted-foreground">
                  {mode === "ai-musical" ? "Music Separation" : "Speech Separation"}
                </p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm">
                  <strong>Note:</strong> In AI mode, heavy visualizations are disabled for better performance.
                  Focus on the AI separation controls on the left.
                </p>
              </div>
            </div>
          </Card>
        </div>
      );
    }

    // Regular visualizations for non-AI modes
    return (
      <div className="space-y-8">
        {renderSignalViewers()}
        {renderFFTViewers()}
        {renderSpectrograms()}
      </div>
    );
  };

  // Signal viewers - only for non-AI modes
  const renderSignalViewers = () => (
    <div className="grid grid-cols-2 gap-4">
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
  );

  // FFT viewers - only for non-AI modes
  const renderFFTViewers = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Frequency Spectrum (FFT)</h2>
        <div className="flex items-center gap-2">
          <Switch checked={useAudiogramScale} onCheckedChange={setUseAudiogramScale} id="audiogram-scale" />
          <Label htmlFor="audiogram-scale" className="text-sm cursor-pointer whitespace-nowrap">
            Audiogram Scale
          </Label>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FFTViewer
          title="Input FFT"
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
          title="Output FFT"
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
  );

  // Spectrograms - only for non-AI modes
  const renderSpectrograms = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Spectrograms</h2>
        <div className="flex items-center gap-2">
          <Switch checked={showSpectrograms} onCheckedChange={setShowSpectrograms} id="show-spectrograms-global" />
          <Label htmlFor="show-spectrograms-global" className="text-sm cursor-pointer">
            Show Spectrograms
          </Label>
        </div>
      </div>

      {showSpectrograms && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Spectrogram
            title="Input Spectrogram"
            stftSlices={inputSlices}
            currentTime={currentTime}
            duration={audioData ? audioData.length / (audioContextRef.current?.sampleRate || 44100) : undefined}
            sampleRate={audioContextRef.current?.sampleRate}
            color="cyan"
            height={260}
          />
          <Spectrogram
            title="Output Spectrogram"
            stftSlices={outputSlices}
            currentTime={currentTime}
            duration={outputData ? outputData.length / (audioContextRef.current?.sampleRate || 44100) : undefined}
            sampleRate={audioContextRef.current?.sampleRate}
            color="magenta"
            height={260}
          />
        </div>
      )}
    </div>
  );

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
      <main className="container mx-auto px-4 py-6">
        <div className="space-y-10">
          {/* Dynamic Controls + Right Column */}
          <div className="grid gap-8" style={{ gridTemplateColumns: "480px 1fr" }}>
            <div className="space-y-4">
              {mainControls}
            </div>

            <div className="space-y-8">
              {renderVisualizations()}
            </div>
          </div>
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
        currentRanges={frequencyRanges}
        onLoad={handleLoadPreset}
      />
    </div>
  );
};

export default Equalizer;