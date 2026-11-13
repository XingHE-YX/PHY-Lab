import {
  MATERIAL,
  modeAt,
  frequency,
  legendre,
  clamp,
  type Parameters,
  type PlateModes,
} from "./plate";
export interface Response {
  real: Float64Array;
  imaginary: Float64Array;
  modalMass: number;
  dominant: number;
  frequencies: number[];
}
export function response(
  plate: PlateModes,
  p: Parameters,
  f = p.frequency,
): Response {
  const omega = 2 * Math.PI * f,
    modalMass = (MATERIAL.density * p.thickness * p.length ** 2) / 4;
  const real = new Float64Array(plate.modes.length),
    imaginary = real.slice();
  const frequencies = plate.modes.map((m) => frequency(m, p));
  let dominant = 0,
    largest = 0;
  plate.modes.forEach((mode, i) => {
    const natural = 2 * Math.PI * frequencies[i],
      a = natural ** 2 - omega ** 2,
      b = 2 * p.damping * natural * omega;
    const force =
      (p.force * modeAt(plate, mode, p.driveX, p.driveY).value) / modalMass;
    real[i] = (force * a) / (a * a + b * b);
    imaginary[i] = (-force * b) / (a * a + b * b);
    const energy = (real[i] ** 2 + imaginary[i] ** 2) * natural ** 2;
    if (energy > largest) {
      largest = energy;
      dominant = i;
    }
  });
  return { real, imaginary, modalMass, dominant, frequencies };
}
export function displacement(
  plate: PlateModes,
  r: Response,
  x: number,
  y: number,
) {
  let real = 0,
    imaginary = 0;
  plate.modes.forEach((mode, i) => {
    const v = modeAt(plate, mode, x, y).value;
    real += v * r.real[i];
    imaginary += v * r.imaginary[i];
  });
  return { real, imaginary, amplitude: Math.hypot(real, imaginary) };
}
export function pointAt(
  plate: PlateModes,
  r: Response,
  p: Parameters,
  x: number,
  y: number,
  cycles: number,
) {
  const { real, imaginary, amplitude } = displacement(plate, r, x, y),
    phase = 2 * Math.PI * cycles,
    omega = 2 * Math.PI * p.frequency;
  const w = real * Math.cos(phase) - imaginary * Math.sin(phase);
  const v = -omega * (real * Math.sin(phase) + imaginary * Math.cos(phase));
  return { w, v, a: -(omega ** 2) * w, amplitude, time: cycles / p.frequency };
}
export function energies(r: Response, p: Parameters, cycles: number) {
  const phase = 2 * Math.PI * cycles,
    cos = Math.cos(phase),
    sin = Math.sin(phase),
    omega = 2 * Math.PI * p.frequency;
  let kinetic = 0,
    potential = 0,
    dissipation = 0;
  r.real.forEach((real, i) => {
    const q = real * cos - r.imaginary[i] * sin,
      velocity = -omega * (real * sin + r.imaginary[i] * cos);
    const natural = 2 * Math.PI * r.frequencies[i];
    kinetic += 0.5 * r.modalMass * velocity ** 2;
    potential += 0.5 * r.modalMass * natural ** 2 * q ** 2;
    dissipation +=
      p.damping *
      r.modalMass *
      natural *
      omega ** 2 *
      (real ** 2 + r.imaginary[i] ** 2);
  });
  return { kinetic, potential, averagePower: dissipation };
}
export interface Field {
  size: number;
  real: Float32Array;
  imaginary: Float32Array;
  amplitude: Float32Array;
  peak: number;
}
export function field(plate: PlateModes, r: Response, size = 65): Field {
  // Combine modal coefficients once; grid evaluation then needs only one basis sum.
  const n = plate.degree + 1,
    realCoefficients = new Float64Array(n * n),
    imaginaryCoefficients = realCoefficients.slice();
  plate.modes.forEach((mode, index) =>
    mode.coefficients.forEach((value, i) => {
      realCoefficients[i] += value * r.real[index];
      imaginaryCoefficients[i] += value * r.imaginary[index];
    }),
  );
  const basis = Array.from(
    { length: size },
    (_, i) => legendre(plate.degree, (i * 2) / (size - 1) - 1).p,
  );
  const transform = (coefficients: Float64Array) =>
    basis.map((b) =>
      Float64Array.from({ length: n }, (_, j) => {
        let value = 0;
        for (let i = 0; i < n; i++) value += coefficients[i * n + j] * b[i];
        return value;
      }),
    );
  const re = transform(realCoefficients),
    im = transform(imaginaryCoefficients);
  const real = new Float32Array(size * size),
    imaginary = real.slice(),
    amplitude = real.slice();
  let peak = 0;
  basis.forEach((y, j) =>
    basis.forEach((_, i) => {
      const k = j * size + i;
      for (let m = 0; m < n; m++) {
        real[k] += re[i][m] * y[m];
        imaginary[k] += im[i][m] * y[m];
      }
      amplitude[k] = Math.hypot(real[k], imaginary[k]);
      peak = Math.max(peak, amplitude[k]);
    }),
  );
  return { size, real, imaginary, amplitude, peak };
}
export function responseCurve(
  plate: PlateModes,
  p: Parameters,
  min: number,
  max: number,
) {
  const frequencies = plate.modes.map((m) => frequency(m, p)),
    mass = (MATERIAL.density * p.thickness * p.length ** 2) / 4;
  const coupling = plate.modes.map(
    (m) => (p.force * modeAt(plate, m, p.driveX, p.driveY).value) / mass,
  );
  const samples = Array.from(
    { length: 181 },
    (_, i) => min + ((max - min) * i) / 180,
  );
  frequencies.forEach((f) =>
    [-2, -1, -0.5, 0, 0.5, 1, 2].forEach((offset) =>
      samples.push(f * (1 + offset * p.damping)),
    ),
  );
  samples.push(p.frequency);
  return [...new Set(samples.filter((f) => f >= min && f <= max))]
    .sort((a, b) => a - b)
    .map((f) => {
      const w = 2 * Math.PI * f;
      let squared = 0;
      frequencies.forEach((f0, i) => {
        const natural = 2 * Math.PI * f0,
          a = natural ** 2 - w * w,
          b = 2 * p.damping * natural * w;
        squared += coupling[i] ** 2 / (a * a + b * b);
      });
      return { frequency: f, amplitude: Math.sqrt(squared) / 2 };
    });
}
export function sample(
  grid: Field,
  values: Float32Array,
  x: number,
  y: number,
) {
  const u = clamp(((x + 1) / 2) * (grid.size - 1), 0, grid.size - 1),
    v = clamp(((y + 1) / 2) * (grid.size - 1), 0, grid.size - 1);
  const i = Math.min(grid.size - 2, Math.floor(u)),
    j = Math.min(grid.size - 2, Math.floor(v)),
    a = u - i,
    b = v - j,
    n = grid.size;
  return (
    (1 - b) * ((1 - a) * values[j * n + i] + a * values[j * n + i + 1]) +
    b * ((1 - a) * values[(j + 1) * n + i] + a * values[(j + 1) * n + i + 1])
  );
}
