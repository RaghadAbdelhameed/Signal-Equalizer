// FFTViewer.tsx
import React, { useRef, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ZoomIn, ZoomOut } from "lucide-react";
import { fft } from "@/utils/fft";
import { constructComplexArray } from "@/utils/utils";

interface FFTViewerProps {
  title: string;
  color?: string;
  audioData?: Float32Array | null;
  sampleRate?: number;
  zoom?: number;
  pan?: number;
  onZoomChange?: (zoom: number) => void;
  onPanChange?: (pan: number) => void;
  useAudiogramScale?: boolean;
  onAudiogramChange?: (value: boolean) => void;
}

const FFTViewer: React.FC<FFTViewerProps> = ({
  title,
  color = "cyan",
  audioData,
  sampleRate = 44100,
  zoom = 1,
  pan = 0,
  onZoomChange,
  onPanChange,
  useAudiogramScale = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, pan: 0 });

  useEffect(() => {
    if (!audioData || !canvasRef.current) return;
    drawFFT();
  }, [audioData, sampleRate, zoom, pan, useAudiogramScale]);

  const drawFFT = () => {
    const canvas = canvasRef.current;
    if (!canvas || !audioData) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, width, height);

    const result = computeFFT(audioData, sampleRate);
    if (!result) return;

    let maxMag = 1;
    for (let i = 1; i < result.magnitudes.length; i++) {
      maxMag = Math.max(maxMag, result.magnitudes[i]);
    }

    const nyquist = sampleRate / 2;
    
    // When audiogram scale is on, show full range (20Hz-20kHz) regardless of zoom/pan
    const visibleRange = nyquist / zoom;
    const visibleStart = useAudiogramScale ? 20 : pan * (nyquist - visibleRange);
    const visibleEnd = useAudiogramScale ? 20000 : visibleStart + visibleRange;

    const strokeColor = color === "cyan" ? "#22d3ee" : "#ec4899";
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 12;
    ctx.shadowColor = strokeColor;
    ctx.beginPath();

    const minFreq = 20;
    const maxFreq = 20000;

    let first = true;
    for (let i = 0; i < result.frequencies.length; i++) {
      const f = result.frequencies[i];
      if (f < visibleStart || f > visibleEnd) continue;

      const mag = result.magnitudes[i] / maxMag;
      const y = height - (Math.sqrt(mag) * height * 0.94) - 6;

      let x: number;
      if (useAudiogramScale) {
        x = f <= minFreq ? 0 : f >= maxFreq ? width :
          (Math.log10(f / minFreq) / Math.log10(maxFreq / minFreq)) * width;
      } else {
        x = ((f - visibleStart) / visibleRange) * width;
      }

      if (x < 0 || x > width) continue;
      if (first) { ctx.moveTo(x, y); first = false; }
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Grid + Labels
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 0.5;
    ctx.fillStyle = "#cccccc";
    ctx.font = "10px monospace";
    ctx.textAlign = "center";

    const labels = useAudiogramScale
      ? [125, 250, 500, 1000, 2000, 4000, 8000]
      : [2000, 4000, 8000, 12000, 16000, nyquist];

    labels.forEach(f => {
      if (f < visibleStart || f > visibleEnd) return;

      const x = useAudiogramScale
        ? (Math.log10(f / minFreq) / Math.log10(maxFreq / minFreq)) * width
        : ((f - visibleStart) / visibleRange) * width;

      if (x < 0 || x > width) return;

      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();

      const label = f >= 1000 ? `${(f / 1000).toFixed(0)}k` : `${f}`;
      ctx.fillText(label, x, height - 4);
    });

    // Baseline
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.beginPath();
    ctx.moveTo(0, height - 6);
    ctx.lineTo(width, height - 6);
    ctx.stroke();
  };

  const computeFFT = (data: Float32Array, sr: number) => {
    try {
      const size = Math.pow(2, Math.floor(Math.log2(data.length)));
      const slice = data.slice(0, size);
      const complex = constructComplexArray(Array.from(slice));
      const res = fft(complex);

      const freqs: number[] = [];
      const mags: number[] = [];
      for (let i = 0; i < size / 2; i++) {
        freqs.push((i * sr) / size);
        mags.push(Math.hypot(res.real[i], res.imag[i]));
      }
      return { frequencies: freqs, magnitudes: mags };
    } catch (e) {
      console.error("FFT error:", e);
      return null;
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!onPanChange || zoom <= 1 || useAudiogramScale) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX, pan });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !onPanChange || zoom <= 1 || useAudiogramScale) return;
    const delta = (e.clientX - dragStart.x) / canvasRef.current!.width;
    const newPan = Math.max(0, Math.min(1 - 1 / zoom, dragStart.pan - delta));
    onPanChange(newPan);
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
    }
  };

  return (
    <Card className="p-4 bg-card border-border">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
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
              onClick={() => onZoomChange?.(Math.min(50, zoom * 1.5))}
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
          </div>
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

      <div className="relative bg-black/50 rounded-lg overflow-hidden cursor-move select-none">
        <canvas
          ref={canvasRef}
          width={900}
          height={300}
          className="w-full h-auto"
          style={{ imageRendering: "crisp-edges" }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
        {!audioData && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
            No data loaded
          </div>
        )}

        {/* X-Axis Label (Frequency) */}
        <div className="flex justify-center mt-1">
          <span className="text-xs text-muted-foreground font-medium">
            Frequency (Hz)
          </span>
        </div>

        
      </div>
    </Card>
  );
};

export default FFTViewer;