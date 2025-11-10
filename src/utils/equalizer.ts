'use strict';

import { fft, ifft } from './fft';
import { ComplexArray } from './utils';

/**
 * Equalizer function: applies frequency-domain gain adjustments to a signal.
 * @param signal - Input real-valued signal array
 * @param gainGridHz - Array of [frequency (Hz), gain] pairs
 * @param sampleRate - Sampling rate in Hz
 * @returns The equalized real-valued signal
 */
export function equalizer(
  signal: number[],
  gainGridHz: [number, number][],
  sampleRate: number
): number[] {
  // 1. Convert signal to frequency domain using FFT
  const fftOutput: ComplexArray = fft(signal);

  // 2. Convert Hz grid to FFT bin gains
  const gainGridBins = createBinGains(fftOutput.real.length, gainGridHz, sampleRate);

  // 3. Apply gains to each FFT bin
  const multiplied: ComplexArray = {
    real: new Array(fftOutput.real.length),
    imag: new Array(fftOutput.imag.length),
  };

  for (let i = 0; i < fftOutput.real.length; i++) {
    multiplied.real[i] = fftOutput.real[i] * gainGridBins[i];
    multiplied.imag[i] = fftOutput.imag[i] * gainGridBins[i];
  }

  // 4. Convert back to time domain using IFFT
  const equalizedSignal = ifft(multiplied);

  // 5. Return only the real part
  return equalizedSignal.real;
}

/**
 * Converts frequency–gain pairs in Hz into per-bin gain values for FFT bins.
 * @param fftSize - Number of FFT bins
 * @param gainGridHz - Array of [frequency (Hz), gain] pairs
 * @param sampleRate - Sampling rate in Hz
 * @returns Array of per-bin gains
 */
export function createBinGains(
  fftSize: number,
  gainGridHz: [number, number][],
  sampleRate: number
): number[] {
  const binGains = new Array(fftSize).fill(1.0);

  for (let i = 0; i < gainGridHz.length; i++) {
    const [freqHz, gain] = gainGridHz[i];
    const binIndex = Math.round((freqHz * fftSize) / sampleRate); // K = (Fi * N) / Fs

    if (binIndex >= 0 && binIndex < fftSize) {
      binGains[binIndex] = gain;
    }
  }

  return binGains;
}

export default { equalizer };
