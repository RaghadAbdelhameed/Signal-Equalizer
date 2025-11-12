'use strict';

import { ifft } from './fft';
import { ComplexArray } from './utils';

export function equalizer(
  fftOutput: ComplexArray,
  rangeControlsHz: [number, number, number][], // [minFreq, maxFreq, gain][]
  sampleRate: number
): { timeDomain: number[]; frequencyDomain: ComplexArray } {
  
  console.log("=== EQUALIZER CALLED ===");
  console.log("FFT size:", fftOutput.real.length);
  console.log("Range controls:", rangeControlsHz);
  console.log("Sample rate:", sampleRate);

  // 1. Convert Hz range controls to FFT bin gains
  const binGains = createBinGainsFromRanges(fftOutput.real.length, rangeControlsHz, sampleRate);
  
  // Log gain statistics
  const changedBins = binGains.filter(gain => gain !== 1.0).length;
  const totalBins = binGains.length;
  console.log(`Gain distribution: ${changedBins}/${totalBins} bins modified (${((changedBins/totalBins)*100).toFixed(1)}%)`);
  
  if (changedBins === 0) {
    console.warn("WARNING: No bins were modified - check your frequency ranges!");
  }

  // 2. Apply gains to each FFT bin
  const frequencyDomain: ComplexArray = {
    real: new Array(fftOutput.real.length),
    imag: new Array(fftOutput.imag.length),
  };

  let changesApplied = 0;
  let maxGainApplied = 1;
  let minGainApplied = 1;
  
  for (let i = 0; i < fftOutput.real.length; i++) {
    const originalReal = fftOutput.real[i];
    const originalImag = fftOutput.imag[i];
    
    frequencyDomain.real[i] = originalReal * binGains[i];
    frequencyDomain.imag[i] = originalImag * binGains[i];
    
    if (binGains[i] !== 1.0) {
      changesApplied++;
      maxGainApplied = Math.max(maxGainApplied, binGains[i]);
      minGainApplied = Math.min(minGainApplied, binGains[i]);
    }
  }

  console.log(`Applied gains to ${changesApplied} bins (gain range: ${minGainApplied.toFixed(2)}-${maxGainApplied.toFixed(2)})`);

  // 3. Convert back to time domain using IFFT
  const equalizedSignal = ifft(frequencyDomain);
  console.log("IFFT completed, time domain length:", equalizedSignal.real.length);

  // 4. Return both time and frequency domain results
  return {
    timeDomain: equalizedSignal.real,
    frequencyDomain: frequencyDomain
  };
}

export function createBinGainsFromRanges(
  fftSize: number,
  rangeControlsHz: [number, number, number][],
  sampleRate: number
): number[] {
  const binGains = new Array(fftSize).fill(1.0);
  const nyquist = sampleRate / 2;

  console.log(`Creating bin gains for FFT size: ${fftSize}, sample rate: ${sampleRate}, Nyquist: ${nyquist}Hz`);

  for (const [minFreq, maxFreq, gain] of rangeControlsHz) {
    // Convert frequency range to bin indices
    const binMin = Math.max(0, Math.floor((minFreq * fftSize) / sampleRate));
    const binMax = Math.min(fftSize - 1, Math.ceil((maxFreq * fftSize) / sampleRate));

    console.log(`Range: ${minFreq}-${maxFreq}Hz -> bins ${binMin}-${binMax}, gain: ${gain}`);

    if (binMin <= binMax) {
      for (let bin = binMin; bin <= binMax; bin++) {
        binGains[bin] = gain;
        // Also set symmetric bin for real signals (if not DC or Nyquist)
        if (bin > 0 && bin < fftSize / 2) {
          binGains[fftSize - bin] = gain;
        }
      }
      console.log(`Set bins ${binMin}-${binMax} gain to ${gain}`);
    } else {
      console.warn(`Invalid range for frequency ${minFreq}-${maxFreq}Hz`);
    }
  }

  return binGains;
}

// Keep old function for backward compatibility if needed
export function createBinGains(
  fftSize: number,
  gainControlsHz: [number, number][],
  sampleRate: number
): number[] {
  const rangeControls: [number, number, number][] = gainControlsHz.map(([freq, gain]) => [freq, freq, gain]);
  return createBinGainsFromRanges(fftSize, rangeControls, sampleRate);
}

export default { equalizer, createBinGainsFromRanges, createBinGains };