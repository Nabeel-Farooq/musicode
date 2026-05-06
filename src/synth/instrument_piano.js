const InstrumentPiano = {
  generate(time, timeReleased, midiPitch) {
    const frequency = this.midiToFreq(midiPitch);
    const envelope = this.getEnvelope(time, timeReleased);

    if (envelope <= 0) return null;

    return this.getHarmonics(frequency, envelope);
  },

  midiToFreq(midi) {
    // Standard MIDI → frequency conversion
    return 440 * Math.pow(2, (midi - 69) / 12);
  },

  getEnvelope(time, timeReleased) {
    let env;

    // Attack + decay
    if (time < 0.02) {
      // quick attack
      env = time / 0.02;
    } else {
      // exponential decay (more piano-like)
      env = Math.exp(-3 * time);
    }

    // Release phase
    if (timeReleased > 0) {
      env *= Math.exp(-10 * timeReleased);
    }

    return Math.max(0, env);
  },

  getHarmonics(baseFreq, envelope) {
    const harmonics = [];

    // Slight inharmonicity factor (real piano strings aren't perfect)
    const stretch = 1.002;

    const amplitudes = [
      1.0, 0.5, 0.3, 0.2, 0.15, 0.1,
      0.08, 0.06, 0.05, 0.04, 0.03, 0.02
    ];

    for (let i = 0; i < amplitudes.length; i++) {
      const harmonicNumber = i + 1;

      const freq =
        baseFreq *
        harmonicNumber *
        Math.pow(stretch, harmonicNumber);

      const amp = envelope * amplitudes[i];

      harmonics.push([freq / 440, amp]);
    }

    return harmonics;
  }
};
