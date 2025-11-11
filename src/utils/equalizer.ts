'use strict';

import { ifft } from './fft';
import { ComplexArray } from './utils';

export function equalizer(
  fftOutput: ComplexArray,
  gainControlsHz: [number, number][],
  sampleRate: number
): { timeDomain: number[]; frequencyDomain: ComplexArray } {
  
  console.log("Equalizer called with:", {
    fftSize: fftOutput.real.length,
    gainControls: gainControlsHz,
    sampleRate
  });

  // 1. Convert Hz controls to FFT bin gains
  const binGains = createBinGains(fftOutput.real.length, gainControlsHz, sampleRate);
  console.log("Bin gains (first 10):", binGains.slice(0, 10));

  // 2. Apply gains to each FFT bin
  const frequencyDomain: ComplexArray = {
    real: new Array(fftOutput.real.length),
    imag: new Array(fftOutput.imag.length),
  };

  let changesApplied = 0;
  for (let i = 0; i < fftOutput.real.length; i++) {
    const originalReal = fftOutput.real[i];
    const originalImag = fftOutput.imag[i];
    
    frequencyDomain.real[i] = originalReal * binGains[i];
    frequencyDomain.imag[i] = originalImag * binGains[i];
    
    if (binGains[i] !== 1.0) {
      changesApplied++;
    }
  }

  console.log(`Applied gains to ${changesApplied} bins`);

  // 3. Convert back to time domain using IFFT
  const equalizedSignal = ifft(frequencyDomain);
  console.log("IFFT completed, time domain length:", equalizedSignal.real.length);

  // 4. Return both time and frequency domain results
  return {
    timeDomain: equalizedSignal.real,
    frequencyDomain: frequencyDomain
  };
}

export function createBinGains(
  fftSize: number,
  gainControlsHz: [number, number][],
  sampleRate: number
): number[] {
  const binGains = new Array(fftSize).fill(1.0);

  console.log(`Creating bin gains for FFT size: ${fftSize}, sample rate: ${sampleRate}`);

  for (let i = 0; i < gainControlsHz.length; i++) {
    const [freqHz, gain] = gainControlsHz[i];
    const binIndex = Math.round((freqHz * fftSize) / sampleRate);

    console.log(`Control ${i}: ${freqHz}Hz -> bin ${binIndex}, gain: ${gain}`);

    if (binIndex >= 0 && binIndex < fftSize) {
      binGains[binIndex] = gain;
      console.log(`Set bin ${binIndex} gain to ${gain}`);
    } else {
      console.warn(`Bin index ${binIndex} out of range for frequency ${freqHz}Hz`);
    }
  }

  return binGains;
}

export default { equalizer, createBinGains };