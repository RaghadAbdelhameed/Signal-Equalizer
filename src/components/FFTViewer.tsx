// FFTViewer.tsx
import React, { useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { fft } from "@/utils/fft"; // Import your existing FFT function
import { constructComplexArray } from "@/utils/utils"; // Import your existing utility

interface FFTViewerProps {
  title: string;
  color?: string;
  audioData?: Float32Array | null;
  sampleRate?: number;
}

const FFTViewer: React.FC<FFTViewerProps> = ({ 
  title, 
  color = "cyan", 
  audioData,
  sampleRate = 44100 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!audioData || !canvasRef.current) return;

    drawFFT(audioData, sampleRate);
  }, [audioData, sampleRate]);

  const drawFFT = (data: Float32Array, sampleRate: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = '#000011';
    ctx.fillRect(0, 0, width, height);

    // Compute FFT using your existing fft function
    const fftResult = computeFFT(data);
    
    if (!fftResult) {
      console.log("No FFT result");
      return;
    }

    console.log("FFT Result:", fftResult.magnitudes.length, "points");

    // Draw FFT graph
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();

    const maxFreq = sampleRate / 2; // Nyquist frequency
    const maxMagnitude = Math.max(...fftResult.magnitudes.filter(m => isFinite(m)));
    
    if (maxMagnitude <= 0) {
      console.log("No valid magnitudes");
      return;
    }

    console.log("Max magnitude:", maxMagnitude);

    for (let i = 1; i < fftResult.frequencies.length; i++) {
      const freq = fftResult.frequencies[i];
      const magnitude = fftResult.magnitudes[i];
      
      if (!isFinite(freq) || !isFinite(magnitude)) continue;
      
      // Convert to logarithmic scale for better visualization
      const x = (Math.log10(freq + 1) / Math.log10(maxFreq + 1)) * width;
      const y = height - (magnitude / maxMagnitude) * height * 0.9;

      if (i === 1) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.stroke();

    // Draw grid and labels for debugging
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 0.5;
    
    // Frequency markers
    const freqMarkers = [100, 1000, 5000, 10000, 15000];
    freqMarkers.forEach(freq => {
      const x = (Math.log10(freq + 1) / Math.log10(maxFreq + 1)) * width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
      
      ctx.fillStyle = 'white';
      ctx.font = '10px Arial';
      ctx.fillText(freq >= 1000 ? `${freq/1000}k` : `${freq}`, x-10, height-5);
    });
  };

  const computeFFT = (data: Float32Array) => {
    try {
      console.log("Computing FFT for data length:", data.length);
      
      // FFT requires power-of-2 length, so find the nearest power of 2
      const fftSize = Math.pow(2, Math.floor(Math.log2(data.length)));
      console.log("Using FFT size:", fftSize);
      
      // Take a slice of the data that's power-of-2 length
      const sliceData = data.slice(0, fftSize);
      const dataArray = Array.from(sliceData);
      
      // Use your existing constructComplexArray function
      const complexSignal = constructComplexArray(dataArray);
      
      // Use your existing fft function
      const fftResult = fft(complexSignal);
      
      // Calculate frequencies and magnitudes
      const frequencies: number[] = [];
      const magnitudes: number[] = [];

      // Only use first half (real signal FFT is symmetric)
      for (let i = 0; i < Math.floor(fftSize / 2); i++) {
        const freq = (i * sampleRate) / fftSize;
        frequencies.push(freq);
        
        const real = fftResult.real[i];
        const imag = fftResult.imag[i];
        
        // Calculate magnitude
        const magnitude = Math.sqrt(real * real + imag * imag);
        magnitudes.push(magnitude);
      }

      console.log("Computed FFT with", frequencies.length, "frequency bins");
      return { frequencies, magnitudes };
    } catch (error) {
      console.error('FFT computation error:', error);
      return null;
    }
  };

  return (
    <Card className="p-4 bg-card border-border h-64 flex flex-col justify-between">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-base font-semibold">{title}</h3>
      </div>

      <div className="flex-1 rounded-lg border border-border bg-muted/30 overflow-hidden relative">
        <canvas
          ref={canvasRef}
          width={500}
          height={200}
          className="w-full h-full"
        />
        {!audioData && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <p className="text-sm text-muted-foreground">No audio data</p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default FFTViewer;