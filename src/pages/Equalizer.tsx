import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Play,
  Pause,
  SkipBack,
  Upload,
  Download,
  Home,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Plus,
  Settings,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import SignalViewer from "@/components/SignalViewer";
import Spectrogram from "@/components/Spectrogram";
import EqualizerControls from "@/components/EqualizerControls";
import AddFrequencyDialog from "@/components/AddFrequencyDialog";
import PresetManager, { EqualizerPreset } from "@/components/PresetManager";
import ModeSelectorDialog from "@/components/ModeSelectorDialog";
import { AudioSourceSeparation } from "@/components/AudioSourceSeparation";

interface FrequencyRange {
  minFreq: number;
  maxFreq: number;
  gain: number;
}

const Equalizer = () => {
  const { mode: urlMode } = useParams();
  const navigate = useNavigate();
  
  const [mode, setMode] = useState(urlMode || "generic");
  const [subMode, setSubMode] = useState<"equalizer" | "ai">("equalizer");
  
  // Update mode if URL changes
  useEffect(() => {
    if (urlMode && urlMode !== mode) {
      setMode(urlMode);
    }
  }, [urlMode]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showSpectrograms, setShowSpectrograms] = useState(true);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioData, setAudioData] = useState<Float32Array | null>(null);
  const [outputData, setOutputData] = useState<Float32Array | null>(null);
  
  // Frequency ranges for generic mode (min, max, gain) - widely spaced to allow adding many new ranges
  const defaultRanges: FrequencyRange[] = [
    { minFreq: 20, maxFreq: 150, gain: 1 },
    { minFreq: 1000, maxFreq: 1500, gain: 1 },
    { minFreq: 3000, maxFreq: 3500, gain: 1 },
    { minFreq: 5000, maxFreq: 5500, gain: 1 },
    { minFreq: 7000, maxFreq: 7500, gain: 1 },
    { minFreq: 9000, maxFreq: 10000, gain: 1 },
    { minFreq: 12000, maxFreq: 13000, gain: 1 },
    { minFreq: 15500, maxFreq: 18000, gain: 1 },
  ];
  
  const [frequencyRanges, setFrequencyRanges] = useState<FrequencyRange[]>(defaultRanges);
  const [sliderValues, setSliderValues] = useState<number[]>(
    mode === "generic" ? defaultRanges.map(r => r.gain) : Array(8).fill(1)
  );
  
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [useAudiogramScale, setUseAudiogramScale] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState(0);
  
  const [showAddFrequency, setShowAddFrequency] = useState(false);
  const [showPresetManager, setShowPresetManager] = useState(false);
  const [showModeSelector, setShowModeSelector] = useState(false);

  // AI Mode states
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

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const playbackSpeedRef = useRef<number>(1);

  const formatFrequency = (freq: number) => {
    if (freq >= 1000) {
      return `${(freq / 1000).toFixed(freq % 1000 === 0 ? 0 : 1)}kHz`;
    }
    return `${freq}Hz`;
  };

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
        return {
          title: "AI Musical Separation",
          sliders: [],
          isGeneric: false,
          isAI: true,
        };
      case "ai-human":
        return {
          title: "AI Speaker Separation",
          sliders: [],
          isGeneric: false,
          isAI: true,
        };
      default:
        return {
          title: "Generic Mode",
          sliders: frequencyRanges.map(r => `${formatFrequency(r.minFreq)}-${formatFrequency(r.maxFreq)}`),
          isGeneric: true,
          isAI: false,
        };
    }
  };

  const handleModeChange = (newMode: string) => {
    setMode(newMode);
    if (newMode === "generic") {
      setFrequencyRanges(defaultRanges);
      setSliderValues(defaultRanges.map(r => r.gain));
    } else {
      setSliderValues(Array(8).fill(1));
    }
    // Reapply processing with new settings
    if (audioData) {
      setOutputData(audioData.slice());
    }
  };

  const handleMusicalVolumeChange = (id: string, volume: number) => {
    setMusicalSources(prev => 
      prev.map(source => source.id === id ? { ...source, volume } : source)
    );
  };

  const handleMusicalMuteToggle = (id: string) => {
    setMusicalSources(prev => 
      prev.map(source => source.id === id ? { ...source, muted: !source.muted } : source)
    );
  };

  const handleHumanVolumeChange = (id: string, volume: number) => {
    setHumanSources(prev => 
      prev.map(source => source.id === id ? { ...source, volume } : source)
    );
  };

  const handleHumanMuteToggle = (id: string) => {
    setHumanSources(prev => 
      prev.map(source => source.id === id ? { ...source, muted: !source.muted } : source)
    );
  };

  const config = getModeConfig();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setAudioFile(file);
      
      // Create audio context
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }

      // Read file as array buffer
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      
      // Get audio data from first channel
      const channelData = audioBuffer.getChannelData(0);
      setAudioData(channelData);
      setOutputData(channelData.slice()); // Initial output is same as input
      
      toast.success("Audio file loaded successfully");
    } catch (error) {
      console.error("Error loading audio:", error);
      toast.error("Failed to load audio file");
    }
  };

  const handlePlayPause = () => {
    if (!audioContextRef.current || !outputData) {
      toast.error("Please load an audio file first");
      return;
    }

    if (isPlaying) {
      sourceRef.current?.stop();
      setIsPlaying(false);
    } else {
      // Create a new buffer with the processed data
      const buffer = audioContextRef.current.createBuffer(
        1,
        outputData.length,
        audioContextRef.current.sampleRate
      );
      const channelData = buffer.getChannelData(0);
      channelData.set(outputData);

      // Create and start source
      const source = audioContextRef.current.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = playbackSpeed;
      source.connect(audioContextRef.current.destination);
      source.start();
      
      source.onended = () => setIsPlaying(false);
      sourceRef.current = source;
      setIsPlaying(true);
    }
  };

  const handlePlaybackSpeedChange = (value: number[]) => {
    const newSpeed = value[0];
    setPlaybackSpeed(newSpeed);
    playbackSpeedRef.current = newSpeed;
    
    // Update playback rate in real-time if audio is playing
    if (sourceRef.current) {
      sourceRef.current.playbackRate.value = newSpeed;
    }
  };

  const handleSliderChange = (index: number, value: number[]) => {
    const newValues = [...sliderValues];
    newValues[index] = value[0];
    setSliderValues(newValues);

    // Apply equalizer effect (simplified - in real implementation, apply FFT)
    if (audioData) {
      const processed = new Float32Array(audioData.length);
      for (let i = 0; i < audioData.length; i++) {
        // Simple gain application (in real app, this would be frequency-specific)
        const bandIndex = Math.floor((i / audioData.length) * newValues.length);
        processed[i] = audioData[i] * newValues[bandIndex];
      }
      setOutputData(processed);
    }
  };

  const handleReset = () => {
    if (mode === "generic") {
      setFrequencyRanges(defaultRanges);
      setSliderValues(defaultRanges.map(r => r.gain));
    } else {
      setSliderValues(Array(sliderValues.length).fill(1));
    }
    setZoom(1);
    setPan(0);
    if (audioData) {
      setOutputData(audioData.slice());
    }
    toast.success("Settings reset");
  };

  const handleAddFrequency = (range: FrequencyRange) => {
    const newRanges = [...frequencyRanges, range].sort((a, b) => a.minFreq - b.minFreq);
    setFrequencyRanges(newRanges);
    setSliderValues(newRanges.map(r => r.gain));
  };

  const handleLoadPreset = (preset: EqualizerPreset) => {
    // Convert preset frequencies back to ranges
    const ranges: FrequencyRange[] = [];
    for (let i = 0; i < preset.frequencies.length; i++) {
      const minFreq = i === 0 ? 20 : preset.frequencies[i - 1];
      const maxFreq = preset.frequencies[i];
      ranges.push({ minFreq, maxFreq, gain: preset.gains[i] });
    }
    
    setFrequencyRanges(ranges);
    setSliderValues(preset.gains);
    
    // Reapply processing with new settings
    if (audioData) {
      const processed = new Float32Array(audioData.length);
      for (let i = 0; i < audioData.length; i++) {
        const bandIndex = Math.floor((i / audioData.length) * preset.gains.length);
        processed[i] = audioData[i] * preset.gains[bandIndex];
      }
      setOutputData(processed);
    }
  };

  const handleZoomIn = () => setZoom(Math.min(20, zoom * 1.5));
  const handleZoomOut = () => setZoom(Math.max(1, zoom / 1.5));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/")}
                className="hover:bg-primary/10"
              >
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowModeSelector(true)}
              >
                <Settings className="h-4 w-4 mr-2" />
                Change Mode
              </Button>
              {config.isGeneric && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddFrequency(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Range
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPresetManager(true)}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Presets
                  </Button>
                </>
              )}
              <Button variant="outline" size="sm" onClick={() => document.getElementById('audio-upload')?.click()}>
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
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Signal Viewers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SignalViewer
            title="Input Signal"
            data={audioData}
            color="cyan"
            zoom={zoom}
            pan={pan}
            onZoomChange={setZoom}
            onPanChange={setPan}
          />
          <SignalViewer
            title="Output Signal"
            data={outputData}
            color="magenta"
            zoom={zoom}
            pan={pan}
            onZoomChange={setZoom}
            onPanChange={setPan}
          />
        </div>

        {/* Playback Controls */}
        <Card className="p-6 bg-card border-border">
          <h3 className="text-lg font-semibold mb-4">Playback & View Controls</h3>
          <div className="space-y-4">
            {/* Playback Controls Row */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleReset}
                  className="hover:bg-primary/10"
                  title="Reset all settings"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePlayPause}
                  className="hover:bg-primary/10"
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </Button>
              </div>

              <div className="flex items-center gap-3 flex-1 max-w-sm">
                <Label className="text-sm font-medium min-w-[80px]">Speed: {playbackSpeed.toFixed(1)}x</Label>
                <Slider
                  value={[playbackSpeed]}
                  onValueChange={handlePlaybackSpeedChange}
                  min={0.5}
                  max={2}
                  step={0.1}
                  className="flex-1"
                />
              </div>
            </div>

            {/* Zoom/Pan Controls Row */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleZoomOut}
                  className="hover:bg-primary/10"
                  title="Zoom Out"
                  disabled={zoom <= 1}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleZoomIn}
                  className="hover:bg-primary/10"
                  title="Zoom In"
                  disabled={zoom >= 20}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center gap-3 flex-1 max-w-sm">
                <Label className="text-sm font-medium min-w-[80px]">Zoom: {zoom.toFixed(1)}x</Label>
                <Slider
                  value={[zoom]}
                  onValueChange={(v) => setZoom(v[0])}
                  min={1}
                  max={20}
                  step={0.1}
                  className="flex-1"
                />
              </div>

              <div className="flex items-center gap-3 flex-1 max-w-sm">
                <Label className="text-sm font-medium min-w-[80px]">Pan: {(pan * 100).toFixed(0)}%</Label>
                <Slider
                  value={[pan]}
                  onValueChange={(v) => setPan(v[0])}
                  min={0}
                  max={Math.max(0, 1 - 1/zoom)}
                  step={0.01}
                  className="flex-1"
                  disabled={zoom <= 1}
                />
              </div>
            </div>

            {/* Options Row */}
            <div className="flex items-center gap-6 pt-2 border-t border-border">
              <div className="flex items-center gap-2">
                <Switch
                  checked={useAudiogramScale}
                  onCheckedChange={setUseAudiogramScale}
                  id="audiogram-scale"
                />
                <Label htmlFor="audiogram-scale" className="text-sm cursor-pointer">Audiogram Scale</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={showSpectrograms}
                  onCheckedChange={setShowSpectrograms}
                  id="show-spectrograms"
                />
                <Label htmlFor="show-spectrograms" className="text-sm cursor-pointer">Show Spectrograms</Label>
              </div>
            </div>
          </div>
        </Card>

        {/* Equalizer Controls or AI Separation with Tabs for music/voices */}
        {(mode === "music" || mode === "voices") ? (
          <Card className="p-6 bg-card border-border">
            <Tabs value={subMode} onValueChange={(v) => setSubMode(v as "equalizer" | "ai")}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="equalizer">Equalizer Mode</TabsTrigger>
                <TabsTrigger value="ai">AI Separation</TabsTrigger>
              </TabsList>
              <TabsContent value="equalizer">
                <EqualizerControls
                  labels={config.sliders}
                  values={sliderValues}
                  onChange={handleSliderChange}
                />
              </TabsContent>
              <TabsContent value="ai">
                {mode === "music" ? (
                  <AudioSourceSeparation
                    mode="musical"
                    sources={musicalSources}
                    onVolumeChange={handleMusicalVolumeChange}
                    onMuteToggle={handleMusicalMuteToggle}
                  />
                ) : (
                  <AudioSourceSeparation
                    mode="human"
                    sources={humanSources}
                    onVolumeChange={handleHumanVolumeChange}
                    onMuteToggle={handleHumanMuteToggle}
                  />
                )}
              </TabsContent>
            </Tabs>
          </Card>
        ) : (
          <EqualizerControls
            labels={config.sliders}
            values={sliderValues}
            onChange={handleSliderChange}
          />
        )}

        {/* Spectrograms */}
        {showSpectrograms && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fade-in">
            <Spectrogram
              title="Input Spectrogram"
              data={audioData}
              color="cyan"
            />
            <Spectrogram
              title="Output Spectrogram"
              data={outputData}
              color="magenta"
            />
          </div>
        )}
      </main>

      {/* Dialogs */}
      <ModeSelectorDialog
        open={showModeSelector}
        onOpenChange={setShowModeSelector}
        onSelectMode={handleModeChange}
        currentMode={mode}
      />
      
      {config.isGeneric && (
        <>
          <AddFrequencyDialog
            open={showAddFrequency}
            onOpenChange={setShowAddFrequency}
            onAdd={handleAddFrequency}
            existingRanges={frequencyRanges}
          />
          <PresetManager
            open={showPresetManager}
            onOpenChange={setShowPresetManager}
            currentFrequencies={frequencyRanges.map(r => r.maxFreq)}
            currentGains={sliderValues}
            onLoad={handleLoadPreset}
          />
        </>
      )}
    </div>
  );
};

export default Equalizer;
