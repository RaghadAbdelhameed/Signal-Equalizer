'use strict';

import * as utils from './utils';

interface ComplexArray {
  real: number[];
  imag: number[];
}

interface ComplexSample {
  real: number;
  imag: number;
}

// real to complex FFT
export function fft(signal: ComplexArray | number[]): ComplexArray {
  let complexSignal: ComplexArray;

  if ((signal as ComplexArray).real === undefined || (signal as ComplexArray).imag === undefined) {
    complexSignal = utils.constructComplexArray(signal as number[]);
  } else {
    const s = signal as ComplexArray;
    complexSignal = {
      real: s.real.slice(),
      imag: s.imag.slice(),
    };
  }

  const N = complexSignal.real.length;
  const logN = Math.log2(N);

  if (Math.round(logN) !== logN) throw new Error('Input size must be a power of 2.');

  if (complexSignal.real.length !== complexSignal.imag.length) {
    throw new Error('Real and imaginary components must have the same length.');
  }

  const bitReversedIndices = utils.bitReverseArray(N);

  // sort array
  const ordered: ComplexArray = {
    real: [],
    imag: [],
  };

  for (let i = 0; i < N; i++) {
    ordered.real[bitReversedIndices[i]] = complexSignal.real[i];
    ordered.imag[bitReversedIndices[i]] = complexSignal.imag[i];
  }

  for (let i = 0; i < N; i++) {
    complexSignal.real[i] = ordered.real[i];
    complexSignal.imag[i] = ordered.imag[i];
  }

  // iterate over the number of stages
  for (let n = 1; n <= logN; n++) {
    const currN = Math.pow(2, n);

    // find twiddle factors
    for (let k = 0; k < currN / 2; k++) {
      const twiddle = utils.euler(k, currN);

      // on each block of FT, implement the butterfly diagram
      for (let m = 0; m < N / currN; m++) {
        const currEvenIndex = currN * m + k;
        const currOddIndex = currN * m + k + currN / 2;

        const currEvenIndexSample: ComplexSample = {
          real: complexSignal.real[currEvenIndex],
          imag: complexSignal.imag[currEvenIndex],
        };
        const currOddIndexSample: ComplexSample = {
          real: complexSignal.real[currOddIndex],
          imag: complexSignal.imag[currOddIndex],
        };

        const odd = utils.multiply(twiddle, currOddIndexSample);

        const subtractionResult = utils.subtract(currEvenIndexSample, odd);
        complexSignal.real[currOddIndex] = subtractionResult.real;
        complexSignal.imag[currOddIndex] = subtractionResult.imag;

        const additionResult = utils.add(odd, currEvenIndexSample);
        complexSignal.real[currEvenIndex] = additionResult.real;
        complexSignal.imag[currEvenIndex] = additionResult.imag;
      }
    }
  }

  return complexSignal;
}

// complex to real IFFT
export function ifft(signal: ComplexArray): ComplexArray {
  if (signal.real === undefined || signal.imag === undefined) {
    throw new Error('IFFT only accepts a complex input.');
  }

  const N = signal.real.length;
  const complexSignal: ComplexArray = { real: [], imag: [] };

  // take complex conjugate
  for (let i = 0; i < N; i++) {
    const currentSample: ComplexSample = {
      real: signal.real[i],
      imag: signal.imag[i],
    };

    const conjugateSample = utils.conj(currentSample);
    complexSignal.real[i] = conjugateSample.real;
    complexSignal.imag[i] = conjugateSample.imag;
  }

  // compute FFT
  const X = fft(complexSignal);

  // normalize
  complexSignal.real = X.real.map((val) => val / N);
  complexSignal.imag = X.imag.map((val) => val / N);

  return complexSignal;
}

export default { fft, ifft };
