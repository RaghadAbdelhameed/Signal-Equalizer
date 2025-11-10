import React from "react";
import { Card } from "@/components/ui/card";

interface FFTViewerProps {
  title: string;
  color?: string;
}

const FFTViewer: React.FC<FFTViewerProps> = ({ title, color = "cyan" }) => {
  return (
    <Card className="p-4 bg-card border-border h-64 flex flex-col justify-between">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-base font-semibold">{title}</h3>
      </div>

      {/* Placeholder for FFT chart */}
      <div
        className="flex-1 rounded-lg border border-border bg-muted/30 flex items-center justify-center"
        style={{
          background: `linear-gradient(180deg, ${color}30 0%, transparent 100%)`,
        }}
      >
        <p className="text-sm text-muted-foreground">FFT Graph Placeholder</p>
      </div>
    </Card>
  );
};

export default FFTViewer;
