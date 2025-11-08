import { useRef, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";

interface SignalViewerProps {
  title: string;
  data: Float32Array | null;
  color: string;
  zoom?: number;
  pan?: number;
  onZoomChange?: (zoom: number) => void;
  onPanChange?: (pan: number) => void;
}

const SignalViewer = ({ 
  title, 
  data, 
  color,
  zoom = 1,
  pan = 0,
  onZoomChange,
  onPanChange
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

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = "rgba(100, 100, 100, 0.2)";
    ctx.lineWidth = 1;

    // Vertical lines
    for (let i = 0; i < 10; i++) {
      const x = (width / 10) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Horizontal lines
    for (let i = 0; i < 5; i++) {
      const y = (height / 5) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw signal with zoom and pan
    const colorMap: Record<string, string> = {
      cyan: "rgb(34, 211, 238)",
      magenta: "rgb(236, 72, 153)",
    };

    // Use color from map if available, otherwise treat as hex/rgb string
    const strokeColor = colorMap[color] || color;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 10;
    ctx.shadowColor = strokeColor;

    ctx.beginPath();
    
    // Calculate visible range based on zoom and pan
    const samplesPerPixel = (data.length / width) / zoom;
    const startSample = Math.max(0, Math.floor(pan * data.length));
    const endSample = Math.min(data.length, startSample + Math.floor(samplesPerPixel * width));
    
    for (let i = 0; i < width; i++) {
      const sampleIndex = Math.floor(startSample + i * samplesPerPixel);
      if (sampleIndex >= endSample) break;
      
      const value = data[sampleIndex] || 0;
      const y = (height / 2) * (1 - value);
      
      if (i === 0) {
        ctx.moveTo(i, y);
      } else {
        ctx.lineTo(i, y);
      }
    }
    ctx.stroke();

    ctx.shadowBlur = 0;
  }, [data, color, zoom, pan]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!onZoomChange) return;
    
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(1, Math.min(20, zoom * delta));
    onZoomChange(newZoom);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !onPanChange || !data) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const delta = (dragStart - e.clientX) / canvas.width;
    const newPan = Math.max(0, Math.min(1 - 1/zoom, pan + delta));
    onPanChange(newPan);
    setDragStart(e.clientX);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <Card className="p-4 bg-card border-border">
      <h3 className="text-sm font-semibold mb-3 text-foreground">{title}</h3>
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
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            No signal loaded
          </div>
        )}
      </div>
    </Card>
  );
};

export default SignalViewer;
