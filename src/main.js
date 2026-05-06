let codeEditor = null;
let codeEditorLineWidgets = [];

let viewer = null;
let song = null;
let synth = null;

let isPlaying = false;

function main() {
  const svgViewerEl = document.getElementById("svgViewer");
  viewer = new Viewer(svgViewerEl);

  window.addEventListener("resize", () => viewer.refresh());
  window.addEventListener("keydown", handleKeyDown);

  synth = new Synth();

  const codeContainer = document.getElementById("divCode");
  codeEditor = CodeMirror(codeContainer, {
    lineNumbers: true,
  });

  codeEditor.setSize("100%", "100%");
  codeEditor.on("change", compile);

  codeEditor.setValue(getDefaultCode());
  codeEditor.focus();
}

function getDefaultCode() {
  return `@key c4
@meter 4/4
@tempo 120


// tuplets and anacrusis
0| :4:3 < a a# b ||


// each group of lines defines a segment of music,
// usually one or more complete measures
0| c d e f |
h| I-- vim-- |


// rests and different durations
0| g-- _- a. a#, b, |
h| V7---- |


// simultaneous notes
0| :1 > c     |
0| :1   g     |
0| :1   d     |
h| :1   Isus2 |


// note extensions from previous measure
// (works with simultaneous tracks)
0| ---- |
0| -- _-- |
0| e---- |
h| I---- |


// meter changes
@meter 11/8

0| > c# c c# c c# c c# c c# c c# |
h|   io7----------- |


// key changes
@key e5

0| e-- g#-- < b g# b c---- |
h| I------- bVI---- |


@key c5
@meter 5/4

0| < b ----- |
h|   V7----- |

0| c----- |
h| I----- |`;
}

function compile() {
  clearEditorErrors();

  const reporter = createMessageReporter();
  const parser = new CompilerParser(codeEditor.getValue(), reporter);

  song = parser.parse();

  if (!isPlaying) {
    viewer.setSong(song);
  }
}

function clearEditorErrors() {
  codeEditorLineWidgets.forEach(widget => widget.clear());
  codeEditorLineWidgets = [];
}

function createMessageReporter() {
  return {
    report(msg) {
      const container = document.createElement("div");

      const icon = document.createElement("span");
      icon.textContent = "×";
      icon.className = "codeEditorErrorIcon";

      const text = document.createTextNode(msg.description);

      container.append(icon, text);
      container.className = "codeEditorErrorText";

      const widget = codeEditor.addLineWidget(msg.lineStart, container, {
        coverGutter: false,
        noHScroll: true,
      });

      codeEditorLineWidgets.push(widget);
    },
  };
}

function togglePlay() {
  isPlaying = !isPlaying;

  if (isPlaying) {
    startPlayback();
  } else {
    stopPlayback();
  }
}

function startPlayback() {
  synth.clear();

  if (song) {
    song.feedSynth(synth, viewer.cursorTick);
  }

  viewer.setCursorPlayback(viewer.cursorTick);
  const startTick = viewer.cursorTick.clone();

  synth.play((time) => {
    const tick = getTickFromTime(time, startTick);

    viewer.setCursorPlayback(tick);

    if (tick.compare(song.length) >= 0) {
      togglePlay();
    }
  });
}

function stopPlayback() {
  synth.clear();
  synth.stop();

  viewer.hideCursorPlayback();
  viewer.setSong(song);
}

function getTickFromTime(time, startTick) {
  const wholeNoteDuration = 1000 / song.bpm / 4;
  const percentage = time / wholeNoteDuration;

  const tick = Rational.fromFloat(
    percentage,
    new Rational(0, 1, 64)
  );

  tick.add(startTick);
  return tick;
}

function handleKeyDown(ev) {
  if (ev.ctrlKey && ev.key === " ") {
    ev.preventDefault();
    togglePlay();
  }
}
