import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Pause, Play, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface PlaybackControlsProps {
  showSpectrograms: boolean;
  audioContextRef: React.RefObject<AudioContext | null>;
  outputData: Float32Array | null;
  onResetZoom: () => void;
  onResetPan: () => void;
}

const PlaybackControls = ({
  audioContextRef,
  outputData,
  onResetZoom,
  onResetPan,
}: PlaybackControlsProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  const handlePlayPause = () => {
    if (!audioContextRef.current || !outputData) {
      toast.error("Please load an audio file first");
      return;
    }

    if (isPlaying) {
      sourceRef.current?.stop();
      setIsPlaying(false);
    } else {
      const buffer = audioContextRef.current.createBuffer(
        1,
        outputData.length,
        audioContextRef.current.sampleRate
      );
      buffer.getChannelData(0).set(outputData);

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
    if (sourceRef.current) {
      sourceRef.current.playbackRate.value = newSpeed;
    }
  };

  const handleReset = () => {
    if (isPlaying) {
      sourceRef.current?.stop();
      setIsPlaying(false);
    }
    setPlaybackSpeed(1);
    onResetZoom();
    onResetPan();
  };

  return (
    <Card className="p-4 bg-card/50 backdrop-blur-sm border-border/50">
      <div className="flex flex-wrap items-center gap-4">
        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleReset}
            className="h-10 w-10 rounded-full hover:bg-primary/10"
          >
            <RotateCcw className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePlayPause}
            className="h-10 w-10 rounded-full hover:bg-primary/10"
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
          </Button>
        </div>

        {/* Speed Control */}
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {playbackSpeed.toFixed(1)}x
          </span>
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
    </Card>
  );
};

export default PlaybackControls;