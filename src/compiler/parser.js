function CompilerParser(src, msgReporter) {
  this.song = new Song();
  this.reader = new CompilerReader(src);
  this.lineReader = null;
  this.msgReporter = msgReporter;

  this.trackNum = 1;

  this.MEASURE = {
    REGULAR: 0,
    FORCED: 1,
    CONTINUE: 2
  };
}

CompilerParser.prototype.parse = function () {
  this.lineReader = this.reader.makeLineReader();

  const segment = this.createSegmentState();

  this.song.keyAdd(segment.currentKey);
  this.song.meterAdd(segment.currentMeter);

  while (!this.reader.isOver()) {
    this.lineReader.skipWhitespace();

    try {
      if (this.lineReader.isOver()) {
        this.finishSegment(segment);
      } else if (this.lineReader.currentChar() === '@') {
        this.finishSegment(segment);
        this.parseDirective(segment);
      } else {
        this.parseTrack(segment);
      }
    } catch (err) {
      this.handleReport(err);
    }

    if (!this.lineReader.isOver()) {
      this.msgReporter.report(this.lineReader.makeError("expected line end"));
    }

    this.lineReader = this.reader.makeLineReader();
  }

  this.finishSegment(segment);
  this.song.setLength(segment.segmentStartTick.clone());

  this.sortSong();

  return this.song;
};

CompilerParser.prototype.createSegmentState = function () {
  return {
    segmentStartTick: new Rational(0),
    firstMeasureStartTick: new Rational(0),
    currentKey: new SongKey(new Rational(0), null, 60),
    currentMeter: new SongMeter(new Rational(0), 4, 4),

    noteTracks: [[]],
    chordTrack: null,

    lastNoteByTrack: [[]],
    lastChord: null,

    measureTerminatorsToMatch: null,
    lastMeasureTerminatorWasContinuable: false
  };
};

CompilerParser.prototype.sortSong = function () {
  this.song.notes.sort((a, b) => a.startTick.compare(b.startTick));
  this.song.chords.sort((a, b) => a.startTick.compare(b.startTick));
  this.song.keys.sort((a, b) => a.tick.compare(b.tick));
  this.song.meters.sort((a, b) => a.tick.compare(b.tick));
  this.song.measures.sort((a, b) => a.compare(b));
};

CompilerParser.prototype.handleReport = function (err) {
  if (err && err.description) this.msgReporter.report(err);
  else throw err;
};

CompilerParser.prototype.parseDirective = function (segment) {
  this.lineReader.match('@');
  this.lineReader.skipWhitespace();

  const directive = this.lineReader.readString("expected directive");
  this.lineReader.skipWhitespace();

  const handlers = {
    key: this.parseDirectiveKey,
    meter: this.parseDirectiveMeter,
    tempo: this.parseDirectiveTempo
  };

  if (!handlers[directive]) {
    throw this.lineReader.makeError(`unknown directive '${directive}'`);
  }

  handlers[directive].call(this, segment);
};

CompilerParser.prototype.parseTrack = function (segment) {
  let trackData;

  if (this.lineReader.charIsNumber(this.lineReader.currentChar())) {
    const trackIndex = parseInt(this.lineReader.readInteger());
    this.lineReader.skipWhitespace();

    this.expectMeasureStart(segment);

    const subTrackIndex = (segment.noteTracks[trackIndex] || []).length;

    trackData = this.parseTrackNotes(segment, trackIndex, subTrackIndex);

    segment.noteTracks[trackIndex] ??= [];
    segment.noteTracks[trackIndex].push(trackData);
  }
  else if (this.lineReader.currentChar().toLowerCase() === 'h') {
    if (segment.chordTrack) {
      throw this.lineReader.makeError("duplicate harmony track");
    }

    this.lineReader.advance();
    this.lineReader.skipWhitespace();

    this.expectMeasureStart(segment);

    trackData = this.parseTrackChords(segment);
    segment.chordTrack = trackData;
  }
  else {
    throw this.lineReader.makeError("expected track");
  }

  if (!segment.measureTerminatorsToMatch) {
    segment.measureTerminatorsToMatch = trackData.measureTerminators;
  }
};

CompilerParser.prototype.expectMeasureStart = function (segment) {
  if (segment.lastMeasureTerminatorWasContinuable)
    this.lineReader.match('~', "expected '~'");
  else
    this.lineReader.match('|', "expected '|'");
  
  this.lineReader.skipWhitespace();
};

CompilerParser.prototype.advanceTick = function (trackData, duration) {
  const start = trackData.currentTick.clone();
  trackData.currentTick.add(duration);
  return start;
};

CompilerParser.prototype.parseTrackNotes = function (segment, trackIndex, subTrackIndex) {
  const track = this.createTrackState(segment);

  while (!this.lineReader.isOver()) {
    this.parseItemsLoop({
      parseItem: () => this.parseNote(segment, track),
      extendItem: () => this.parseNoteExtension(segment, track, trackIndex, subTrackIndex),
      store: (note, start, end) => {
        const songNote = new SongNote(start, end, trackIndex, note.pitch);
        track.notes.push(songNote);

        segment.lastNoteByTrack[trackIndex] ??= [];
        segment.lastNoteByTrack[trackIndex][subTrackIndex] = songNote;
      },
      track,
      segment
    });

    this.parseMeasureTerminator(segment, track);
  }

  return track;
};

CompilerParser.prototype.parseTrackChords = function (segment) {
  const track = this.createTrackState(segment);

  while (!this.lineReader.isOver()) {
    this.parseItemsLoop({
      parseItem: () => this.parseChord(segment, track),
      extendItem: () => this.parseChordExtension(segment, track),
      store: (chord, start, end) => {
        const songChord = new SongChord(
          start,
          end,
          chord.chordKind,
          chord.rootPitch,
          chord.embelishments
        );
        track.chords.push(songChord);
        segment.lastChord = songChord;
      },
      track,
      segment
    });

    this.parseMeasureTerminator(segment, track);
  }

  return track;
};

CompilerParser.prototype.parseItemsLoop = function ({ parseItem, extendItem, store, track, segment }) {
  while (true) {
    const ch = this.lineReader.currentChar();

    if (ch === ':') {
      this.parseDurationSpecifier(track);
    }
    else if (['-', '.', ',', ';'].includes(ch)) {
      const ext = extendItem();
      track.currentTick.add(ext.duration);
    }
    else {
      const item = parseItem();
      if (!item) break;

      const start = this.advanceTick(track, item.duration);
      store(item, start, track.currentTick.clone());
    }
  }
};

CompilerParser.prototype.createTrackState = function (segment) {
  return {
    measureTerminators: [],
    notes: [],
    chords: [],
    currentMeasureStartTick: segment.firstMeasureStartTick.clone(),
    currentTick: segment.segmentStartTick.clone(),
    baseDuration: segment.currentMeter.getBeatLength(),
    currentOctaveOffset: 0
  };
};
