import { useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import { fft } from "../utils/fft";
import { equalizer } from "../utils/equalizer";
import { ComplexArray } from "../utils/utils";

export interface FFTData {
  frequencies: number[];
  magnitudes: number[];
}
interface FrequencyRange {
  minFreq: number;
  maxFreq: number;
  gain: number;
}
export interface AudioProcessorResult {
  audioFile: File | null;
  audioData: Float32Array | null;
  outputData: Float32Array | null;
  inputFFT: FFTData | null;
  outputFFT: FFTData | null;
  inputSlices: Uint8Array[];
  outputSlices: Uint8Array[];
  isPlaying: boolean;
  audioContextRef: React.RefObject<AudioContext | null>;
  handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleExport: () => Promise<void>;
  processAudio: (rangeControlsHz: [number, number, number][]) => void;
  resetOutput: () => void;
  playAudio: () => void;
  stopAudio: () => void;
  setPlaybackTimeListener: (callback: ((time: number) => void) | null) => void;
}

const constructComplexArray = (real: number[]): ComplexArray => ({
  real,
  imag: new Array(real.length).fill(0),
});

// Store both the complex FFT and visualization data
let storedComplexFFT: ComplexArray | null = null;
let storedFFTData: FFTData | null = null;

export const useAudioProcessor = (): AudioProcessorResult => {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioData, setAudioData] = useState<Float32Array | null>(null);
  const [outputData, setOutputData] = useState<Float32Array | null>(null);
  const [inputFFT, setInputFFT] = useState<FFTData | null>(null);
  const [outputFFT, setOutputFFT] = useState<FFTData | null>(null);
  const [inputSlices, setInputSlices] = useState<Uint8Array[]>([]);
  const [outputSlices, setOutputSlices] = useState<Uint8Array[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const [onPlaybackTimeUpdate, setOnPlaybackTimeUpdate] = useState<((time: number) => void) | null>(null);

  /** Compute FFT for processing and visualization */
  const computeFFT = useCallback((data: Float32Array, sr: number): FFTData | null => {
    const originalLength = data.length;
    const fftSize = Math.pow(2, Math.ceil(Math.log2(originalLength)));
    const padded = new Float32Array(fftSize);
    padded.set(data);

    // Compute complex FFT for processing
    const complex = constructComplexArray(Array.from(padded));
    const complexFFT = fft(complex);

    // Store the complex FFT for later processing
    storedComplexFFT = complexFFT;

    // Compute FFT data for visualization
    const freqs: number[] = [];
    const mags: number[] = [];
    for (let i = 0; i < fftSize / 2; i++) {
      freqs.push((i * sr) / fftSize);
      mags.push(Math.hypot(complexFFT.real[i], complexFFT.imag[i]));
    }

    const fftData = { frequencies: freqs, magnitudes: mags };
    storedFFTData = fftData;
    return fftData;
  }, []);

  /** Compute STFT slices for spectrogram */
const computeSTFT = useCallback((data: Float32Array, fftSize = 2048, hopSize = 512) => {
  const slices: Uint8Array[] = [];
  const hannWindow = new Array(fftSize).fill(0).map((_, i) =>
    0.5 * (1 - Math.cos((2 * Math.PI * i) / (fftSize - 1)))
  );

  let maxMag = 1e-12;

  // First pass → find peak magnitude (for normalization)
  for (let start = 0; start + fftSize <= data.length; start += hopSize) {
    const frame = data.slice(start, start + fftSize);
    const windowed = frame.map((v, i) => v * hannWindow[i]);
    const complexFFT = fft({ real: Array.from(windowed), imag: new Array(fftSize).fill(0) });
    for (let j = 0; j < fftSize / 2; j++) {
      const mag = Math.hypot(complexFFT.real[j], complexFFT.imag[j]);
      maxMag = Math.max(maxMag, mag);
    }
  }

  // Second pass → normalized dB conversion
  for (let start = 0; start + fftSize <= data.length; start += hopSize) {
    const frame = data.slice(start, start + fftSize);
    const windowed = frame.map((v, i) => v * hannWindow[i]);
    const complexFFT = fft({ real: Array.from(windowed), imag: new Array(fftSize).fill(0) });

    const magDbSlice = new Uint8Array(fftSize / 2);
    for (let j = 0; j < fftSize / 2; j++) {
      const mag = Math.hypot(complexFFT.real[j], complexFFT.imag[j]);
      const db = 20 * Math.log10(mag / maxMag + 1e-12); // Normalize vs max
      const norm = Math.min(255, Math.max(0, Math.floor(((db + 100) / 100) * 255))); // -100dB → 0, 0dB → 255
      magDbSlice[j] = norm;
    }

    slices.push(magDbSlice);
  }

  return slices;
}, []);


  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setAudioFile(file);

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }

      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);

      // MIX TO MONO (exactly like librosa.load)
      let channelData: Float32Array;
      const length = audioBuffer.length;

      if (audioBuffer.numberOfChannels === 1) {
        channelData = audioBuffer.getChannelData(0);
      } else {
        channelData = new Float32Array(length);
        for (let i = 0; i < length; i++) {
          let sum = 0;
          for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
            sum += audioBuffer.getChannelData(ch)[i];
          }
          channelData[i] = sum / audioBuffer.numberOfChannels;
        }
      }

      setAudioData(channelData);
      setOutputData(channelData.slice());

      const sampleRate = audioContextRef.current.sampleRate;

      // Compute FFT and store both visualization data and complex FFT
      const fftResult = computeFFT(channelData, sampleRate);

      setInputFFT(fftResult);
      setOutputFFT(fftResult);

      setInputSlices(computeSTFT(channelData));
      setOutputSlices(computeSTFT(channelData));

      toast.success("Audio loaded (mono mix) – matches Librosa");

    } catch (error) {
      console.error("Error loading audio:", error);
      toast.error("Failed to load audio file");
    }
  }, [computeFFT, computeSTFT]);

  const processAudio = useCallback((ranges: [number, number, number][]) => {
    if (!audioData || !audioContextRef.current || !storedComplexFFT) {
      console.log("❌ Missing data for processing:", {
        audioData: !!audioData,
        audioContext: !!audioContextRef.current,
        storedComplexFFT: !!storedComplexFFT
      });
      return;
    }

    console.log("🎵 Processing audio with frequency ranges:", ranges);

    const sampleRate = audioContextRef.current.sampleRate;
    const originalLength = audioData.length;

    // Already a tuple list → just sort
    const sortedControls = [...ranges].sort((a, b) => a[0] - b[0]);

    const { timeDomain, frequencyDomain } = equalizer(
      storedComplexFFT,
      sortedControls,
      sampleRate
    );

    const outputArray = new Float32Array(timeDomain.slice(0, originalLength));

    let differences = 0;
    for (let i = 0; i < Math.min(10, audioData.length); i++) {
      if (Math.abs(audioData[i] - outputArray[i]) > 0.001) {
        differences++;
      }
    }
    console.log(`🔍 Sample comparison: ${differences}/10 samples differ significantly`);

    setOutputData(outputArray);

    // Update STFT for spectrogram
    setOutputSlices(computeSTFT(outputArray));

    const fftSize = frequencyDomain.real.length;
    const freqs: number[] = [];
    const mags: number[] = [];
    for (let i = 0; i < fftSize / 2; i++) {
      freqs.push((i * sampleRate) / fftSize);
      mags.push(Math.hypot(frequencyDomain.real[i], frequencyDomain.imag[i]));
    }

    setOutputFFT({ frequencies: freqs, magnitudes: mags });

    console.log("✅ Processing complete - output data length:", outputArray.length);
  }, [audioData, computeSTFT]);


  const resetOutput = useCallback(() => {
    if (audioData && storedFFTData) {
      setOutputData(audioData.slice());
      setOutputFFT(storedFFTData);
      setOutputSlices(computeSTFT(audioData));
    }
  }, [audioData, computeSTFT]);

  /** Playback controls */
const playAudio = useCallback(() => {
    if (!outputData || !audioContextRef.current) return;

    // Stop previous
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      sourceNodeRef.current.disconnect();
    }
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

    const ctx = audioContextRef.current;
    const buffer = ctx.createBuffer(1, outputData.length, ctx.sampleRate);
    buffer.getChannelData(0).set(outputData);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);

    const now = ctx.currentTime;
    startTimeRef.current = now;

    source.start(now);
    sourceNodeRef.current = source;
    setIsPlaying(true);

    const update = () => {
      const elapsed = ctx.currentTime - startTimeRef.current;
      const duration = outputData.length / ctx.sampleRate;

      if (elapsed >= duration) {
        setIsPlaying(false);
        onPlaybackTimeUpdate?.(0);
        return;
      }

      onPlaybackTimeUpdate?.(elapsed);
      animationFrameRef.current = requestAnimationFrame(update);
    };

    animationFrameRef.current = requestAnimationFrame(update);

    source.onended = () => {
      setIsPlaying(false);
      onPlaybackTimeUpdate?.(0);
    };
  }, [outputData, onPlaybackTimeUpdate]);

  const stopAudio = () => {
    audioContextRef.current?.close();
    audioContextRef.current = null;
    setIsPlaying(false);
  };

  const audioBufferToWav = (buffer: AudioBuffer): ArrayBuffer => {
    const length = buffer.length * buffer.numberOfChannels * 2 + 44;
    const arrayBuffer = new ArrayBuffer(length);
    const view = new DataView(arrayBuffer);
    const channels: Float32Array[] = [];
    let offset = 0;
    let pos = 0;

    const setUint16 = (data: number) => {
      view.setUint16(pos, data, true);
      pos += 2;
    };
    const setUint32 = (data: number) => {
      view.setUint32(pos, data, true);
      pos += 4;
    };

    setUint32(0x46464952); // RIFF
    setUint32(length - 8);
    setUint32(0x45564157); // WAVE
    setUint32(0x20746d66); // fmt 
    setUint32(16);
    setUint16(1); // PCM
    setUint16(buffer.numberOfChannels);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * 2 * buffer.numberOfChannels);
    setUint16(buffer.numberOfChannels * 2);
    setUint16(16);
    setUint32(0x61746164); // data
    setUint32(length - pos - 4);

    for (let i = 0; i < buffer.numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    while (pos < length) {
      for (let i = 0; i < buffer.numberOfChannels; i++) {
        let sample = Math.max(-1, Math.min(1, channels[i][offset]));
        sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        view.setInt16(pos, sample, true);
        pos += 2;
      }
      offset++;
    }

    return arrayBuffer;
  };

  const handleExport = useCallback(async () => {
    if (!audioContextRef.current || !outputData) {
      toast.error("No processed audio to export");
      return;
    }

    try {
      const offlineContext = new OfflineAudioContext(
        1,
        outputData.length,
        audioContextRef.current.sampleRate
      );

      const buffer = offlineContext.createBuffer(1, outputData.length, audioContextRef.current.sampleRate);
      buffer.getChannelData(0).set(outputData);

      const source = offlineContext.createBufferSource();
      source.buffer = buffer;
      source.connect(offlineContext.destination);
      source.start();

      const renderedBuffer = await offlineContext.startRendering();
      const wav = audioBufferToWav(renderedBuffer);
      const blob = new Blob([wav], { type: "audio/wav" });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `processed_${audioFile?.name || "audio"}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Audio exported successfully");
    } catch (error) {
      console.error("Error exporting audio:", error);
      toast.error("Failed to export audio");
    }
  }, [audioFile, outputData]);

  return {
    audioFile,
    audioData,
    outputData,
    inputFFT,
    outputFFT,
    inputSlices,
    outputSlices,
    isPlaying,
    playAudio,
    stopAudio,
    setPlaybackTimeListener: setOnPlaybackTimeUpdate,
    audioContextRef,
    handleFileUpload,
    handleExport,
    processAudio,
    resetOutput,
  };
};