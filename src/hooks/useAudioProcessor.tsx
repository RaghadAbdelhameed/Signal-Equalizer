import { useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import { fft } from "../utils/fft"; 
import { constructComplexArray } from "../utils/utils";

export interface FFTData {
  frequencies: number[];
  magnitudes: number[];
}

export interface AudioProcessorResult {
  audioFile: File | null;
  audioData: Float32Array | null;
  outputData: Float32Array | null;
  inputFFT: FFTData | null;
  outputFFT: FFTData | null;
  audioContextRef: React.RefObject<AudioContext | null>;
  handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleExport: () => Promise<void>;
  processAudio: (processor: (input: Float32Array) => Float32Array) => void;
  resetOutput: () => void;
}

const computeFFT = (data: Float32Array, sr: number): FFTData | null => {
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

export const useAudioProcessor = (): AudioProcessorResult => {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioData, setAudioData] = useState<Float32Array | null>(null);
  const [outputData, setOutputData] = useState<Float32Array | null>(null);
  const [inputFFT, setInputFFT] = useState<FFTData | null>(null);
  const [outputFFT, setOutputFFT] = useState<FFTData | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

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
      const fftData = computeFFT(channelData, sampleRate);
      setInputFFT(fftData);
      setOutputFFT(fftData);

      toast.success("Audio loaded (mono mix) – matches Librosa");
    } catch (error) {
      console.error("Error loading audio:", error);
      toast.error("Failed to load audio file");
    }
  }, []);

  const processAudio = useCallback((processor: (input: Float32Array) => Float32Array) => {
    if (!audioData || !audioContextRef.current) return;
    const processed = processor(audioData);
    setOutputData(processed);
    setOutputFFT(computeFFT(processed, audioContextRef.current.sampleRate));
  }, [audioData]);

  const resetOutput = useCallback(() => {
    if (audioData && inputFFT) {
      setOutputData(audioData.slice());
      setOutputFFT(inputFFT);
    }
  }, [audioData, inputFFT]);

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
    audioContextRef,
    handleFileUpload,
    handleExport,
    processAudio,
    resetOutput,
  };
};