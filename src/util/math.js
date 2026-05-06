const snap = (x, step) => {
  if (step === 0) return x; // avoid division by zero
  return Math.round(x / step) * step;
};

const mod = (x, m) => {
  if (m === 0) return NaN;
  return ((x % m) + m) % m; // always positive modulo
};

const stretch = (x, pivot, origin, delta) => {
  const dist = origin - pivot;

  // Prevent division by zero (critical edge case)
  if (dist === 0) return pivot;

  const scale = (origin + delta - pivot) / dist;

  return Math.round(pivot + (x - pivot) * scale);
};
