import { useRef, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ZoomIn, ZoomOut } from "lucide-react";

interface SignalViewerProps {
  title: string;
  data: Float32Array | null;
  color: string;
  zoom?: number;
  pan?: number;
  onZoomChange?: (zoom: number) => void;
  onPanChange?: (pan: number) => void;
  /** Custom render function (e.g. FFT, Spectrogram) */
  render?: (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    data: Float32Array,
    zoom: number,
    pan: number,
    props: Record<string, any>
  ) => void;
  /** Extra props: sampleRate, etc. */
  renderProps?: Record<string, any>;
}

const SignalViewer = ({
  title,
  data,
  color,
  zoom = 1,
  pan = 0,
  onZoomChange,
  onPanChange,
  render,
  renderProps = {},
}: SignalViewerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);

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

    // Custom render (FFT, etc.)
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

    // Accurate visible sample range
    const totalVisibleSamples = Math.floor(data.length / zoom);
    const startSample = Math.floor(pan * (data.length - totalVisibleSamples));
    const endSample = Math.min(data.length, startSample + totalVisibleSamples);

    const startIdx = Math.max(0, Math.min(data.length - 1, startSample));
    const endIdx = Math.max(startIdx + 1, Math.min(data.length, endSample));
    const samplesToDraw = endIdx - startIdx;
    const pixelsPerSample = width / samplesToDraw;

    // Draw waveform
    for (let i = 0; i < width; i++) {
      const sampleIndex = startIdx + Math.floor(i / pixelsPerSample);
      if (sampleIndex >= endIdx) break;

      const value = data[sampleIndex] || 0;
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

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!onZoomChange) return;
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(1, Math.min(100, zoom * delta));
    onZoomChange(newZoom);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !onPanChange) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const deltaX = e.clientX - dragStart;
    const deltaPan = deltaX / canvas.width / zoom;
    const newPan = Math.max(0, Math.min(1 - 1 / zoom, pan + deltaPan));
    onPanChange(newPan);
    setDragStart(e.clientX);
  };

  const handleMouseUp = () => setIsDragging(false);

  return (
    <Card className="p-4 bg-card border-border">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <div className="flex items-center gap-2">
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
          height={200}
          className="w-full h-auto"
          onWheel={handleWheel}
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