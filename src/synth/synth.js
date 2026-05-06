class Synth {
  constructor() {
    this.audioCtx = new AudioContext();
    this.globalGain = this.audioCtx.createGain();
    this.globalGain.gain.value = 0.1;
    this.globalGain.connect(this.audioCtx.destination);

    this.voices = [];
    this.noteOnEvents = [];
    this.noteOffEvents = [];

    this.instruments = [InstrumentPiano, InstrumentPiano];

    this.isPlaying = false;
    this.startTime = 0;
  }

  play(callback) {
    this.processCallback = callback;
    this.sortEvents();

    this.startTime = this.audioCtx.currentTime;
    this.isPlaying = true;

    this.schedule();
  }

  stop() {
    this.isPlaying = false;
    this.clear();
  }

  clear() {
    this.voices.forEach(v => this.voiceStop(v));
    this.voices = [];
    this.noteOnEvents = [];
    this.noteOffEvents = [];
  }

  schedule() {
    if (!this.isPlaying) return;

    const now = this.audioCtx.currentTime;
    const lookahead = 0.1; // 100ms ahead

    this.processEvents(now + lookahead);

    requestAnimationFrame(() => this.schedule());
  }

  processEvents(scheduleTime) {
    while (
      this.noteOnEvents.length &&
      this.noteOnEvents[0].time <= scheduleTime
    ) {
      const ev = this.noteOnEvents.shift();
      this.voiceStart(ev, ev.time);
    }

    while (
      this.noteOffEvents.length &&
      this.noteOffEvents[0].time <= scheduleTime
    ) {
      const ev = this.noteOffEvents.shift();
      this.releaseVoices(ev);
    }
  }

  voiceStart(ev, time) {
    const frequency = 440 * Math.pow(2, (ev.midiPitch - 69) / 12);

    const voice = {
      instrumentIndex: ev.instrumentIndex,
      midiPitch: ev.midiPitch,
      oscillators: [],
      gainNodes: []
    };

    const freqs = this.instruments[ev.instrumentIndex].generate(0, 0, ev.midiPitch);
    if (!freqs) return;

    freqs.forEach(([ratio, amp]) => {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(ratio * frequency, time);

      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(
        amp * ev.volume,
        time + 0.01
      );

      osc.connect(gain);
      gain.connect(this.globalGain);

      osc.start(time);

      voice.oscillators.push(osc);
      voice.gainNodes.push(gain);
    });

    this.voices.push(voice);
  }

  releaseVoices(ev) {
    const now = this.audioCtx.currentTime;

    this.voices.forEach(voice => {
      if (
        voice.instrumentIndex === ev.instrumentIndex &&
        voice.midiPitch === ev.midiPitch
      ) {
        voice.gainNodes.forEach(gain => {
          gain.gain.cancelScheduledValues(now);
          gain.gain.setValueAtTime(gain.gain.value, now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
        });

        setTimeout(() => this.voiceStop(voice), 150);
      }
    });
  }

  voiceStop(voice) {
    voice.oscillators.forEach(o => o.stop());
  }

  addNoteOn(time, instrumentIndex, midiPitch, volume) {
    this.noteOnEvents.push({
      time: this.audioCtx.currentTime + time,
      instrumentIndex,
      midiPitch,
      volume
    });
  }

  addNoteOff(time, instrumentIndex, midiPitch) {
    this.noteOffEvents.push({
      time: this.audioCtx.currentTime + time,
      instrumentIndex,
      midiPitch
    });
  }

  sortEvents() {
    this.noteOnEvents.sort((a, b) => a.time - b.time);
    this.noteOffEvents.sort((a, b) => a.time - b.time);
  }
}
