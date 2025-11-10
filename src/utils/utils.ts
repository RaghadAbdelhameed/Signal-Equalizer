'use strict';

export interface ComplexSample {
  real: number;
  imag: number;
}

export interface ComplexArray {
  real: number[];
  imag: number[];
}

// Memoization of reversals and zero buffers
const memoizedReversal: Record<number, Record<number, number>> = {};
const memoizedZeroBuffers: Record<number, number[]> = {};

// Construct a complex array (convert real signal → complex signal)
export function constructComplexArray(signal: number[] | ComplexArray): ComplexArray {
  const complexSignal: ComplexArray = {
    real: Array.isArray((signal as any).real)
      ? (signal as ComplexArray).real.slice()
      : (signal as number[]).slice(),
    imag: [],
  };

  const bufferSize = complexSignal.real.length;

  if (memoizedZeroBuffers[bufferSize] === undefined) {
    memoizedZeroBuffers[bufferSize] = Array(bufferSize).fill(0);
  }

  complexSignal.imag = memoizedZeroBuffers[bufferSize].slice();

  return complexSignal;
}

// Bit reversal for FFT
export function bitReverseArray(N: number): Record<number, number> {
  if (memoizedReversal[N] === undefined) {
    const maxBinaryLength = (N - 1).toString(2).length;
    const templateBinary = '0'.repeat(maxBinaryLength);
    const reversed: Record<number, number> = {};

    for (let n = 0; n < N; n++) {
      let currBinary = n.toString(2);
      currBinary = templateBinary.substring(currBinary.length) + currBinary;
      currBinary = [...currBinary].reverse().join('');
      reversed[n] = parseInt(currBinary, 2);
    }

    memoizedReversal[N] = reversed;
  }
  return memoizedReversal[N];
}

// Complex multiplication
export function multiply(a: ComplexSample, b: ComplexSample): ComplexSample {
  return {
    real: a.real * b.real - a.imag * b.imag,
    imag: a.real * b.imag + a.imag * b.real,
  };
}

// Complex addition
export function add(a: ComplexSample, b: ComplexSample): ComplexSample {
  return {
    real: a.real + b.real,
    imag: a.imag + b.imag,
  };
}

// Complex subtraction
export function subtract(a: ComplexSample, b: ComplexSample): ComplexSample {
  return {
    real: a.real - b.real,
    imag: a.imag - b.imag,
  };
}

// Euler's identity: e^(−2πik/N) = cos(x) + i·sin(x)
export function euler(kn: number, N: number): ComplexSample {
  const x = (-2 * Math.PI * kn) / N;
  return {
    real: Math.cos(x),
    imag: Math.sin(x),
  };
}

// Complex conjugate
export function conj(a: ComplexSample): ComplexSample {
  return {
    real: a.real,
    imag: -a.imag,
  };
}

export default {
  bitReverseArray,
  multiply,
  add,
  subtract,
  euler,
  conj,
  constructComplexArray,
};
