export const MATERIAL = { young: 70e9, density: 2700, poisson: 0.33 };
export const clamp = (v: number, a: number, b: number) =>
  Math.max(a, Math.min(b, v));
export function record(v: unknown): Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
}
export interface Parameters {
  length: number;
  thickness: number;
  frequency: number;
  force: number;
  damping: number;
  driveX: number;
  driveY: number;
}
export function parameters(value: unknown): Parameters {
  const v = record(value);
  const n = (key: string, fallback: number, min: number, max: number) =>
    typeof v[key] === "number" && Number.isFinite(v[key])
      ? clamp(v[key] as number, min, max)
      : fallback;
  return {
    length: n("length", 0.36, 0.24, 0.5),
    thickness: n("thickness", 0.001, 0.0006, 0.0015),
    frequency: n("frequency", 300, 20, 3000),
    force: n("force", 0.035, 0, 0.15),
    damping: n("damping", 0.012, 0.005, 0.08),
    driveX: n("driveX", 0.72, -0.94, 0.94),
    driveY: n("driveY", 0.38, -0.94, 0.94),
  };
}
export interface Mode {
  eigenvalue: number;
  coefficients: Float64Array;
}
export interface PlateModes {
  degree: number;
  modes: Mode[];
  residual: number;
}

// Normalized Legendre functions and their first two derivatives on [-1, 1].
export function legendre(degree: number, x: number) {
  const p = new Float64Array(degree + 1),
    d = new Float64Array(degree + 1),
    dd = new Float64Array(degree + 1);
  p[0] = 1;
  if (degree) {
    p[1] = x;
    d[1] = 1;
  }
  for (let k = 2; k <= degree; k++) {
    p[k] = ((2 * k - 1) * x * p[k - 1] - (k - 1) * p[k - 2]) / k;
    d[k] = ((2 * k - 1) * (p[k - 1] + x * d[k - 1]) - (k - 1) * d[k - 2]) / k;
    dd[k] =
      ((2 * k - 1) * (2 * d[k - 1] + x * dd[k - 1]) - (k - 1) * dd[k - 2]) / k;
  }
  for (let k = 0; k <= degree; k++) {
    const norm = Math.sqrt((2 * k + 1) / 2);
    p[k] *= norm;
    d[k] *= norm;
    dd[k] *= norm;
  }
  return { p, d, dd };
}
function quadrature(n: number) {
  const nodes: { x: number; weight: number }[] = [];
  for (let i = 0; i < n; i++) {
    let x = Math.cos((Math.PI * (i + 0.75)) / (n + 0.5));
    for (let j = 0; j < 20; j++) {
      const { p, d } = legendre(n, x),
        step = p[n] / d[n];
      x -= step;
      if (Math.abs(step) < 1e-14) break;
    }
    const { d } = legendre(n, x);
    nodes.push({ x, weight: (2 * n + 1) / ((1 - x * x) * d[n] * d[n]) });
  }
  return nodes;
}
const dot = (a: Float64Array, b: Float64Array) =>
  a.reduce((sum, v, i) => sum + v * b[i], 0);
function normalize(v: Float64Array) {
  const norm = Math.sqrt(dot(v, v));
  for (let i = 0; i < v.length; i++) v[i] /= norm;
  return v;
}
// Nine fixed displacement points approximate a small rigid central mounting pad.
// No outer-edge displacement or slope is prescribed: its conditions are natural.
function admissible(degree: number) {
  const n = degree + 1,
    size = n * n,
    constraints: Float64Array[] = [];
  for (const x of [-0.1, 0, 0.1])
    for (const y of [-0.1, 0, 0.1]) {
      const bx = legendre(degree, x).p,
        by = legendre(degree, y).p;
      const v = Float64Array.from(
        { length: size },
        (_, i) => bx[Math.floor(i / n)] * by[i % n],
      );
      for (let pass = 0; pass < 2; pass++)
        for (const c of constraints) {
          const projection = dot(v, c);
          for (let i = 0; i < size; i++) v[i] -= projection * c[i];
        }
      constraints.push(normalize(v));
    }
  const basis: Float64Array[] = [];
  for (let k = 0; k < size; k++) {
    const v = new Float64Array(size);
    v[k] = 1;
    // Reorthogonalization keeps the projected mass matrix equal to identity.
    for (let pass = 0; pass < 2; pass++)
      for (const u of [...constraints, ...basis]) {
        const c = dot(u, v);
        for (let i = 0; i < size; i++) v[i] -= c * u[i];
      }
    if (dot(v, v) > 1e-18) basis.push(normalize(v));
  }
  return basis;
}
export function bendingMatrix(degree: number, poisson = MATERIAL.poisson) {
  const n = degree + 1,
    size = n * n;
  const first = new Float64Array(n * n),
    second = new Float64Array(n * n),
    mixed = new Float64Array(n * n);
  for (const { x, weight } of quadrature(degree + 2)) {
    const { p, d, dd } = legendre(degree, x);
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        first[i * n + j] += weight * d[i] * d[j];
        second[i * n + j] += weight * dd[i] * dd[j];
        mixed[i * n + j] += weight * dd[i] * p[j];
      }
  }
  const matrix = new Float64Array(size * size);
  for (let a = 0; a < size; a++)
    for (let b = 0; b <= a; b++) {
      const i = Math.floor(a / n),
        j = a % n,
        k = Math.floor(b / n),
        l = b % n;
      const v =
        second[i * n + k] * (j === l ? 1 : 0) +
        (i === k ? 1 : 0) * second[j * n + l] +
        poisson *
          (mixed[i * n + k] * mixed[l * n + j] +
            mixed[k * n + i] * mixed[j * n + l]) +
        2 * (1 - poisson) * first[i * n + k] * first[j * n + l];
      matrix[a * size + b] = matrix[b * size + a] = v;
    }
  return matrix;
}
function eigenvectors(input: Float64Array, n: number) {
  const a = input.slice(),
    v = new Float64Array(n * n);
  for (let i = 0; i < n; i++) v[i * n + i] = 1;
  for (let sweep = 0; sweep < 40; sweep++) {
    let max = 0,
      scale = 0;
    for (let i = 0; i < n; i++) scale = Math.max(scale, Math.abs(a[i * n + i]));
    for (let p = 0; p < n; p++)
      for (let q = p + 1; q < n; q++) {
        const off = a[p * n + q];
        max = Math.max(max, Math.abs(off));
        if (Math.abs(off) < Math.max(1e-12, scale * 1e-15)) continue;
        const tau = (a[q * n + q] - a[p * n + p]) / (2 * off);
        const t = (tau >= 0 ? 1 : -1) / (Math.abs(tau) + Math.hypot(1, tau));
        const c = 1 / Math.hypot(1, t),
          s = t * c;
        a[p * n + p] -= t * off;
        a[q * n + q] += t * off;
        a[p * n + q] = a[q * n + p] = 0;
        for (let k = 0; k < n; k++) {
          if (k !== p && k !== q) {
            const kp = a[k * n + p],
              kq = a[k * n + q];
            a[k * n + p] = a[p * n + k] = c * kp - s * kq;
            a[k * n + q] = a[q * n + k] = s * kp + c * kq;
          }
          const vp = v[k * n + p],
            vq = v[k * n + q];
          v[k * n + p] = c * vp - s * vq;
          v[k * n + q] = s * vp + c * vq;
        }
      }
    if (max < Math.max(1e-11, scale * 1e-14)) break;
  }
  return {
    values: Array.from({ length: n }, (_, i) => a[i * n + i]),
    vectors: v,
  };
}
export function solvePlate(degree = 10, count = 24): PlateModes {
  const k = bendingMatrix(degree),
    z = admissible(degree),
    n = z.length,
    size = (degree + 1) ** 2;
  const kz = z.map((vector) =>
    Float64Array.from({ length: size }, (_, i) => {
      let sum = 0;
      for (let j = 0; j < size; j++) sum += k[i * size + j] * vector[j];
      return sum;
    }),
  );
  const projected = Float64Array.from({ length: n * n }, (_, i) =>
    dot(z[Math.floor(i / n)], kz[i % n]),
  );
  const eig = eigenvectors(projected, n);
  const indices = eig.values
    .map((value, i) => ({ value, i }))
    .sort((a, b) => a.value - b.value)
    .slice(0, count);
  let residual = 0;
  const modes = indices.map(({ value, i }) => {
    const vector = Float64Array.from(
      { length: n },
      (_, j) => eig.vectors[j * n + i],
    );
    let error = 0;
    for (let row = 0; row < n; row++) {
      let kv = 0;
      for (let col = 0; col < n; col++)
        kv += projected[row * n + col] * vector[col];
      error += (kv - value * vector[row]) ** 2;
    }
    residual = Math.max(residual, Math.sqrt(error) / Math.max(1, value));
    const coefficients = Float64Array.from({ length: size }, (_, j) => {
      let sum = 0;
      for (let col = 0; col < n; col++) sum += z[col][j] * vector[col];
      return sum;
    });
    let pivot = 0;
    for (let j = 1; j < size; j++)
      if (Math.abs(coefficients[j]) > Math.abs(coefficients[pivot])) pivot = j;
    if (coefficients[pivot] < 0)
      for (let j = 0; j < size; j++) coefficients[j] *= -1;
    return { eigenvalue: value, coefficients };
  });
  return { degree, modes, residual };
}
export function modeAt(plate: PlateModes, mode: Mode, x: number, y: number) {
  const bx = legendre(plate.degree, x),
    by = legendre(plate.degree, y),
    n = plate.degree + 1;
  let value = 0,
    dx = 0,
    dy = 0;
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const c = mode.coefficients[i * n + j];
      value += c * bx.p[i] * by.p[j];
      dx += c * bx.d[i] * by.p[j];
      dy += c * bx.p[i] * by.d[j];
    }
  return { value, dx, dy };
}
export function frequency(
  mode: Mode,
  p: Pick<Parameters, "length" | "thickness">,
) {
  const d =
    (MATERIAL.young * p.thickness ** 3) / (12 * (1 - MATERIAL.poisson ** 2));
  return (
    (4 *
      Math.sqrt(d / (MATERIAL.density * p.thickness)) *
      Math.sqrt(mode.eigenvalue)) /
    (2 * Math.PI * p.length ** 2)
  );
}
