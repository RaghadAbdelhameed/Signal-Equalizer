import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface EqualizerControlsProps {
  labels: string[];
  values: number[];
  onChange: (index: number, value: number[]) => void;
  onRemove?: (index: number) => void;
}

const EqualizerControls = ({ labels, values, onChange, onRemove }: EqualizerControlsProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [removeDialogIndex, setRemoveDialogIndex] = useState<number | null>(null);
  const lastClickTimeRef = useRef<{ index: number; time: number } | null>(null);

  // Convert value (0-2) to dB scale for display (-12 to +12)
  const valueToDb = (value: number) => (value - 1) * 12;
  const dbToValue = (db: number) => db / 12 + 1;

  const handleReset = () => {
    labels.forEach((_, index) => {
      onChange(index, [1]);
    });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const padding = 80;
    const topPadding = 40;
    const bottomPadding = 80;
    const drawHeight = height - topPadding - bottomPadding;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;

    // Horizontal grid lines (dB levels)
    for (let i = 0; i <= 4; i++) {
      const y = topPadding + (drawHeight * i) / 4;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    // Vertical grid lines (frequencies) - spanning full grid width
    const availableWidth = width - padding * 2;
    const spacing = availableWidth / (labels.length - 1); // Evenly distribute across full width
    const startX = padding; // Start at left edge of grid
    
    for (let i = 0; i < labels.length; i++) {
      const x = startX + i * spacing;
      ctx.beginPath();
      ctx.moveTo(x, topPadding);
      ctx.lineTo(x, height - bottomPadding);
      ctx.stroke();
    }

    // Draw gain scale (0-2)
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.font = "12px Inter, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";

    for (let i = 0; i <= 4; i++) {
      const gainValue = 2 - i * 0.5; // 2.0, 1.5, 1.0, 0.5, 0.0
      const y = topPadding + (drawHeight * i) / 4;
      ctx.fillText(gainValue.toFixed(1), padding - 10, y);
    }

    // Calculate curve points
    const points: { x: number; y: number }[] = [];
    for (let i = 0; i < values.length; i++) {
      const x = startX + i * spacing;
      const normalizedValue = (2 - values[i]) / 2; // Invert: 2 -> 0, 0 -> 1
      const y = topPadding + normalizedValue * drawHeight;
      points.push({ x, y });
    }

    // Draw gradient fill
    const gradient = ctx.createLinearGradient(0, topPadding, 0, height - bottomPadding);
    gradient.addColorStop(0, "hsla(186, 100%, 50%, 0.4)"); // cyan
    gradient.addColorStop(0.5, "hsla(322, 100%, 60%, 0.3)"); // magenta
    gradient.addColorStop(1, "hsla(280, 90%, 65%, 0.2)"); // purple

    ctx.beginPath();
    ctx.moveTo(points[0].x, height - bottomPadding);

    // Draw smooth curve through points
    for (let i = 0; i < points.length; i++) {
      if (i === 0) {
        ctx.lineTo(points[i].x, points[i].y);
      } else {
        const prev = points[i - 1];
        const curr = points[i];
        const cp1x = prev.x + (curr.x - prev.x) / 3;
        const cp1y = prev.y;
        const cp2x = curr.x - (curr.x - prev.x) / 3;
        const cp2y = curr.y;
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, curr.x, curr.y);
      }
    }

    ctx.lineTo(points[points.length - 1].x, height - bottomPadding);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw curve line
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cp1x = prev.x + (curr.x - prev.x) / 3;
      const cp1y = prev.y;
      const cp2x = curr.x - (curr.x - prev.x) / 3;
      const cp2y = curr.y;
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, curr.x, curr.y);
    }

    ctx.strokeStyle = "hsl(186, 100%, 50%)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw control points
    points.forEach((point, index) => {
      const isHovered = hoveredIndex === index;
      const isDragging = draggingIndex === index;
      const radius = isHovered || isDragging ? 8 : 6;

      // Point glow
      const pointGradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, radius * 2);
      pointGradient.addColorStop(0, "hsla(186, 100%, 50%, 0.6)");
      pointGradient.addColorStop(1, "hsla(186, 100%, 50%, 0)");
      ctx.fillStyle = pointGradient;
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius * 2, 0, Math.PI * 2);
      ctx.fill();

      // Point circle
      ctx.fillStyle = isHovered || isDragging ? "hsl(186, 100%, 50%)" : "hsl(186, 100%, 60%)";
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "hsl(220, 26%, 10%)";
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // Draw frequency labels
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.font = "11px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    labels.forEach((label, index) => {
      const x = startX + index * spacing;
      ctx.fillText(label, x, height - bottomPadding + 10);
      
      // Show gain value
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.font = "10px Inter, sans-serif";
      ctx.fillText(`${values[index].toFixed(2)}`, x, height - bottomPadding + 24);
      ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
      ctx.font = "11px Inter, sans-serif";
    });
  }, [values, labels, hoveredIndex, draggingIndex, valueToDb]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const padding = 80;
    const availableWidth = rect.width - padding * 2;
    const spacing = availableWidth / (labels.length - 1);
    const startX = padding;

    // Find closest point
    let closestIndex = -1;
    let minDistance = Infinity;

    values.forEach((_, index) => {
      const pointX = startX + index * spacing;
      const distance = Math.abs(x - pointX);

      if (distance < 20 && distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });

    if (closestIndex !== -1) {
      // Check for double-click
      const now = Date.now();
      const lastClick = lastClickTimeRef.current;
      
      if (lastClick && lastClick.index === closestIndex && now - lastClick.time < 300) {
        // Double-click detected
        if (onRemove && labels.length > 2) {
          setRemoveDialogIndex(closestIndex);
        }
        lastClickTimeRef.current = null;
      } else {
        // Single click - start dragging
        lastClickTimeRef.current = { index: closestIndex, time: now };
        setDraggingIndex(closestIndex);
      }
    }
  };
  
  const handleConfirmRemove = () => {
    if (removeDialogIndex !== null && onRemove) {
      onRemove(removeDialogIndex);
      setRemoveDialogIndex(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const padding = 80;
    const topPadding = 40;
    const bottomPadding = 80;
    const drawHeight = rect.height - topPadding - bottomPadding;
    const availableWidth = rect.width - padding * 2;
    const spacing = availableWidth / (labels.length - 1);
    const startX = padding;

    if (draggingIndex !== null) {
      // Update value based on y position
      const normalizedY = Math.max(0, Math.min(1, (y - topPadding) / drawHeight));
      const newValue = 2 - normalizedY * 2; // Invert back: 0 -> 2, 1 -> 0
      onChange(draggingIndex, [Math.max(0, Math.min(2, newValue))]);
    } else {
      // Check hover
      let closestIndex = -1;
      let minDistance = Infinity;

      values.forEach((_, index) => {
        const pointX = startX + index * spacing;
        const distance = Math.abs(x - pointX);

        if (distance < 20 && distance < minDistance) {
          minDistance = distance;
          closestIndex = index;
        }
      });

      setHoveredIndex(closestIndex !== -1 ? closestIndex : null);
    }
  };

  const handleMouseUp = () => {
    setDraggingIndex(null);
  };

  const handleMouseLeave = () => {
    setDraggingIndex(null);
    setHoveredIndex(null);
  };

  return (
    <>
      <div className="relative">
        <canvas
          ref={canvasRef}
          className="w-full h-[360px] cursor-pointer"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        />
      </div>
      
      <AlertDialog open={removeDialogIndex !== null} onOpenChange={(open) => !open && setRemoveDialogIndex(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Frequency Point</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove the frequency point at{" "}
              <strong>{removeDialogIndex !== null ? labels[removeDialogIndex] : ""}</strong>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRemove}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default EqualizerControls;