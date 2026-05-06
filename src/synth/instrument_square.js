const InstrumentSquareWave = {
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

    // Attack (fast, clean)
    if (time < 0.01) {
      env = time / 0.01;
    } 
    // Sustain (flat-ish, like classic square synth)
    else {
      env = 1;
    }

    // Release (quick cutoff typical of square leads)
    if (timeReleased > 0) {
      env *= Math.exp(-15 * timeReleased);
    }

    return Math.max(0, env);
  },

  getHarmonics(baseFreq, envelope) {
    const harmonics = [];
    const maxHarmonics = 10;

    for (let i = 0; i < maxHarmonics; i++) {
      const n = 2 * i + 1; // odd harmonics only

      const freq = baseFreq * n;
      const amp = envelope * (1 / n);

      harmonics.push([freq / 440, amp]);
    }

    return harmonics;
  }
};
