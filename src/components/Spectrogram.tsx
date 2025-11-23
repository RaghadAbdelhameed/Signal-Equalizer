import { useRef, useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ColorScheme = "viridis" | "plasma" | "inferno" | "magma" | "hot" | "cool";

interface SpectrogramProps {
  title: string;
  stftSlices: Uint8Array[];        // All precomputed slices (full duration)
  currentTime: number;              // Current playback time in seconds
  duration?: number;                // Total duration in seconds (optional, computed if not provided)
  sampleRate?: number;
  hopSize?: number;
  color: "cyan" | "magenta";
}

const Spectrogram = ({
  title,
  stftSlices,
  currentTime = 0,
  duration: propDuration,
  sampleRate = 44100,
  hopSize = 512,
  color,
}: SpectrogramProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [colorScheme, setColorScheme] = useState<ColorScheme>(color === "cyan" ? "cool" : "magma");

  // Compute total duration from slices if not provided
  const duration = propDuration ?? (stftSlices.length * hopSize) / sampleRate;

  const getColorMap = useCallback((scheme: ColorScheme): string[] => {
    const colors: string[] = [];
    for (let i = 0; i <= 255; i++) {
      const t = i / 255;
      let r = 0, g = 0, b = 0;
      switch (scheme) {
        case "viridis": r = Math.floor(68 + 185 * t); g = Math.floor(1 + 230 * t); b = Math.floor(84 - 47 * t); break;
        case "plasma": r = Math.floor(13 + 227 * t); g = Math.floor(8 + 241 * Math.pow(t, 0.5)); b = Math.floor(135 - 102 * t); break;
        case "inferno": r = Math.floor(252 * Math.pow(t, 0.8)); g = Math.floor(255 * Math.pow(t, 1.5)); b = Math.floor(164 * Math.pow(t, 2)); break;
        case "magma": r = Math.floor(252 * Math.pow(t, 0.7)); g = Math.floor(253 * Math.pow(t, 1.8)); b = Math.floor(191 * Math.pow(t, 1.2)); break;
        case "hot":
          if (t < 0.4) { r = 255; g = Math.floor(637.5 * t); b = 0; }
          else if (t < 0.7) { r = 255; g = 255; b = Math.floor(850 * (t - 0.4)); }
          else { r = Math.floor(2550 * (1 - t)); g = 255; b = 255; }
          break;
        case "cool": r = Math.floor(255 * t); g = Math.floor(255 * (1 - t)); b = 255; break;
      }
      colors.push(`rgb(${r},${g},${b})`);
    }
    return colors;
  }, []);

  const draw = useCallback(() => {
  const canvas = canvasRef.current;
  if (!canvas || stftSlices.length === 0) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const width = rect.width;
  const height = rect.height;
  const spectrogramHeight = height - 40;

  // Background
  ctx.fillStyle = "#000011";
  ctx.fillRect(0, 0, width, height);

  const colorMap = getColorMap(colorScheme);
  const sliceWidth = width / stftSlices.length;

  // Draw slices
  stftSlices.forEach((slice, sliceIdx) => {
    const x = sliceIdx * sliceWidth;
    const binHeight = spectrogramHeight / slice.length;

    slice.forEach((value, binIdx) => {
      const y = spectrogramHeight - (binIdx + 1) * binHeight;
      ctx.fillStyle = colorMap[value]; // Scaled from 0–255 based on dB
      ctx.fillRect(x, y, sliceWidth + 0.8, binHeight + 0.3);
    });
  });

  // Playhead marker
  if (currentTime > 0 && currentTime <= duration) {
    const playheadX = (currentTime / duration) * width;
    ctx.strokeStyle = color === "cyan" ? "#06b6d4" : "#ec4899";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, spectrogramHeight);
    ctx.stroke();
  }

  // Frequency grid
  ctx.strokeStyle = "rgba(255,107,53,0.4)";
  ctx.font = "10px monospace";
  ctx.fillStyle = "rgba(255,107,53,0.8)";
  ctx.textAlign = "left";

  const maxFreq = sampleRate / 2;
  const freqLabels = [100, 500, 1000, 5000, 10000, 20000];
  freqLabels.forEach(f => {
    if (f <= maxFreq) {
      const y = spectrogramHeight - (f / maxFreq) * spectrogramHeight;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
      ctx.fillText(`${f >= 1000 ? f / 1000 + "k" : f}Hz`, 4, y - 2);
    }
  });

  // Time labels
  ctx.textAlign = "center";
  for (let i = 0; i <= 10; i++) {
    const t = (duration / 10) * i;
    const x = (width / 10) * i;
    ctx.fillText(`${t.toFixed(1)}s`, x, height - 8);
  }
}, [stftSlices, currentTime, duration, colorScheme, sampleRate, color, getColorMap]);


  useEffect(() => {
    draw();
  }, [draw]);

  // Redraw on resize
  useEffect(() => {
    const handleResize = () => draw();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [draw]);

  return (
    <Card className="p-4 bg-card border-border">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-muted-foreground">{title}</h3>
        <Select value={colorScheme} onValueChange={(v) => setColorScheme(v as ColorScheme)}>
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="viridis">Viridis</SelectItem>
            <SelectItem value="plasma">Plasma</SelectItem>
            <SelectItem value="inferno">Inferno</SelectItem>
            <SelectItem value="magma">Magma</SelectItem>
            <SelectItem value="hot">Hot</SelectItem>
            <SelectItem value="cool">Cool</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="relative w-full h-64 bg-background rounded-lg overflow-hidden border border-border">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
        
        {stftSlices.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
            No data loaded
          </div>
        )}

        {/* Current time display */}
        {currentTime > 0 && (
          <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
            {currentTime.toFixed(2)}s / {duration.toFixed(2)}s
          </div>
        )}
      </div>
    </Card>
  );
};

export default Spectrogram;