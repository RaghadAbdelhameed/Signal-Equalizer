import { useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";

interface SpectrogramProps {
  title: string;
  data: Float32Array | null;
  color: "cyan" | "magenta";
}

const Spectrogram = ({ title, data, color }: SpectrogramProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !data) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;

    // Clear canvas
    ctx.fillStyle = "hsl(220, 26%, 8%)";
    ctx.fillRect(0, 0, width, height);

    // Simplified spectrogram visualization
    // In a real implementation, this would use FFT to calculate frequency components
    const fftSize = 256;
    const numBins = fftSize / 2;
    const timeSteps = Math.floor(data.length / fftSize);

    for (let t = 0; t < timeSteps && t < width; t++) {
      for (let f = 0; f < numBins; f++) {
        const startIndex = t * fftSize;
        const endIndex = Math.min(startIndex + fftSize, data.length);
        
        // Calculate magnitude (simplified - should use FFT)
        let sum = 0;
        for (let i = startIndex; i < endIndex; i++) {
          sum += Math.abs(data[i]);
        }
        const magnitude = sum / (endIndex - startIndex);

        // Map to color intensity
        const intensity = Math.min(magnitude * 255, 255);
        
        let r, g, b;
        if (color === "cyan") {
          r = 0;
          g = intensity;
          b = intensity;
        } else {
          r = intensity;
          g = 0;
          b = intensity * 0.6;
        }

        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        
        const x = (t / timeSteps) * width;
        const y = height - (f / numBins) * height;
        const barWidth = Math.ceil(width / timeSteps) + 1;
        const barHeight = Math.ceil(height / numBins) + 1;
        
        ctx.fillRect(x, y, barWidth, barHeight);
      }
    }

  }, [data, color]);

  return (
    <Card className="p-4 bg-card border-border">
      <h3 className="text-sm font-semibold mb-2 text-muted-foreground">{title}</h3>
      <div className="relative w-full h-64 bg-background rounded-lg overflow-hidden border border-border">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
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

export default Spectrogram;
