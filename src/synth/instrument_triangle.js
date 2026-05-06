const InstrumentTriangleWave = {
  generate(time, timeReleased, midiPitch) {
    const frequency = this.midiToFreq(midiPitch);
    const envelope = this.getEnvelope(time, timeReleased);

    if (envelope <= 0) return null;

    return this.getHarmonics(frequency, envelope);
  },

  midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  },

  getEnvelope(time, timeReleased) {
    let env;

    // Softer attack than square
    if (time < 0.05) {
      env = time / 0.05;
    } else {
      // gentle decay (triangle sounds smoother)
      env = Math.exp(-2 * time);
    }

    // smooth release
    if (timeReleased > 0) {
      env *= Math.exp(-8 * timeReleased);
    }

    return Math.max(0, env);
  },

  getHarmonics(baseFreq, envelope) {
    const harmonics = [];
    const maxHarmonics = 10;

    for (let i = 0; i < maxHarmonics; i++) {
      const n = 2 * i + 1; // odd harmonics only

      const freq = baseFreq * n;

      // Triangle wave: amplitude ∝ 1 / n^2
      // ALSO: alternating phase (important!)
      const sign = i % 2 === 0 ? 1 : -1;
      const amp = envelope * sign * (1 / (n * n));

      harmonics.push([freq / 440, amp]);
    }

    return harmonics;
  }
};
