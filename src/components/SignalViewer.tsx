import { useRef, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ZoomIn, ZoomOut, Play, Pause, RotateCcw } from "lucide-react";

interface SignalViewerProps {
  title: string;
  data: Float32Array | null;
  color: string;
  zoom?: number;
  pan?: number;
  height?: number;
  onZoomChange?: (zoom: number) => void;
  onPanChange?: (pan: number) => void;
  render?: (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    data: Float32Array,
    zoom: number,
    pan: number,
    props: Record<string, any>
  ) => void;
  renderProps?: Record<string, any>;
  audioContextRef?: React.RefObject<AudioContext | null>;
  currentTime: number;
  onCurrentTimeChange: (time: number) => void;
  playbackSpeed: number;
  onPlaybackSpeedChange: (speed: number) => void;
}

const SignalViewer = ({
  title,
  data,
  color,
  zoom = 1,
  pan = 0,
  height,
  onZoomChange,
  onPanChange,
  render,
  renderProps = {},
  audioContextRef,
  currentTime,
  onCurrentTimeChange,
  playbackSpeed,
  onPlaybackSpeedChange,
}: SignalViewerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, pan: 0 });
  const [isPlaying, setIsPlaying] = useState(false);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const startTimeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = "rgba(100, 100, 100, 0.2)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 10; i++) {
      const x = (width / 10) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let i = 0; i < 5; i++) {
      const y = (height / 5) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    if (render) {
      render(ctx, width, height, data, zoom, pan, renderProps);
      return;
    }

    // Default waveform render (REAL AUDIO)
    const sampleRate = renderProps?.sampleRate || 44100;

    const colorMap: Record<string, string> = {
      cyan: "rgb(34, 211, 238)",
      magenta: "rgb(236, 72, 153)",
    };
    const strokeColor = colorMap[color] || color;

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 10;
    ctx.shadowColor = strokeColor;

    ctx.beginPath();

    const totalSamples = data.length;
    const visibleSamples = totalSamples / zoom;
    const startSample = pan * (totalSamples - visibleSamples);
    const endSample = startSample + visibleSamples;

    const startIdx = Math.max(0, Math.floor(startSample));
    const endIdx = Math.min(totalSamples, Math.ceil(endSample));
    const pixelsPerSample = width / (endIdx - startIdx);

    // Draw waveform
    for (let i = 0; i < width; i++) {
      const sampleIdx = startIdx + Math.floor(i / pixelsPerSample);
      if (sampleIdx >= endIdx) break;

      const value = data[sampleIdx] || 0;
      const y = (height / 2) * (1 - value);

      if (i === 0) ctx.moveTo(i, y);
      else ctx.lineTo(i, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Time labels (seconds) — PROOF it's real audio
    if (sampleRate && data.length > 0) {
      const duration = data.length / sampleRate;
      const visibleDuration = duration / zoom;
      const startTime = pan * (duration - visibleDuration);

      ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
      ctx.font = "10px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";

      [0, 0.25, 0.5, 0.75, 1].forEach((ratio) => {
        const t = startTime + ratio * visibleDuration;
        const x = ratio * width;
        if (t >= 0 && t <= duration) {
          ctx.fillText(`${t.toFixed(1)}s`, x, height - 4);
        }
      });
    }
  }, [data, color, zoom, pan, render, renderProps]);

  useEffect(() => {
    if (sourceRef.current) {
      sourceRef.current.playbackRate.value = playbackSpeed;
    }
  }, [playbackSpeed]);

  const handlePlayPause = () => {
    if (!audioContextRef?.current || !data) return;
    const context = audioContextRef.current;
    const sampleRate = context.sampleRate;

    if (isPlaying) {
      if (sourceRef.current) {
        const elapsed = context.currentTime - startTimeRef.current;
        const newTime = Math.min(currentTime + (elapsed * playbackSpeed), data.length / sampleRate);
        onCurrentTimeChange(newTime);
        sourceRef.current.stop();
        sourceRef.current = null;
      }
      setIsPlaying(false);
    } else {
      const startSample = Math.floor(currentTime * sampleRate);
      if (startSample >= data.length) return;

      const buffer = context.createBuffer(1, data.length - startSample, sampleRate);
      buffer.getChannelData(0).set(data.slice(startSample));
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = playbackSpeed;
      source.connect(context.destination);
      source.start();
      source.onended = () => {
        setIsPlaying(false);
        onCurrentTimeChange(0);
      };
      sourceRef.current = source;
      startTimeRef.current = context.currentTime;
      setIsPlaying(true);
    }
  };

  const handleSpeedChange = (speed: number) => {
    onPlaybackSpeedChange(speed);
  };

  const handleReset = () => {
    if (sourceRef.current) {
      sourceRef.current.stop();
      sourceRef.current = null;
    }
    setIsPlaying(false);
    onCurrentTimeChange(0);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, pan });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !onPanChange || zoom <= 1) return;
    const deltaX = (e.clientX - dragStart.x) / canvasRef.current!.width;
    const newPan = Math.max(0, Math.min(1 - 1 / zoom, dragStart.pan - deltaX));
    onPanChange(newPan);
  };

  const handleMouseUp = () => setIsDragging(false);

  return (
    <Card className="p-4 bg-card border-border">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <div className="flex items-center gap-2">
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleReset}
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handlePlayPause}
            >
              {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </Button>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground min-w-[32px]">
                {playbackSpeed.toFixed(1)}
              </span>
              <Slider
                value={[playbackSpeed]}
                onValueChange={(v) => handleSpeedChange(v[0])}
                min={0.5}
                max={2}
                step={0.1}
                className="w-20"
              />
            </div>
            <div className="w-px h-5 bg-border mx-1" />
          </>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onZoomChange?.(Math.max(1, zoom / 1.5))}
            disabled={zoom <= 1}
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs text-muted-foreground min-w-[36px] text-center">
            {zoom.toFixed(1)}x
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onZoomChange?.(Math.min(100, zoom * 1.5))}
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {zoom > 1 && (
        <div className="mb-3 flex items-center gap-2">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Pan</span>
          <Slider
            value={[pan]}
            onValueChange={(v) => onPanChange?.(v[0])}
            min={0}
            max={Math.max(0, 1 - 1 / zoom)}
            step={0.001}
            className="flex-1"
          />
        </div>
      )}

      <div className="relative bg-black/50 rounded-lg overflow-hidden cursor-move">
        <canvas
          ref={canvasRef}
    width={800}
    height={height || 200}
    className="w-full h-full"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
        {!data && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
            No data loaded
          </div>
        )}
      </div>
    </Card>
  );
};

export default SignalViewer;