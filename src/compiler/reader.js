class CompilerReader {
  constructor(src, start = 0, end = null, line = 0, column = 0) {
    this.src = src;
    this.index = start;
    this.end = end ?? src.length;
    this.line = line;
    this.column = column;
  }

  makeLineReader() {
    const start = this.index;
    const line = this.line;
    const column = this.column;

    let end = start;

    while (this.index < this.end) {
      const ch = this.currentChar();
      this.advance();
      end++;

      if (ch === '\n') {
        end--; // exclude newline
        break;
      }
    }

    return new CompilerReader(this.src, start, end, line, column);
  }

  makeError(description) {
    return {
      description,
      start: this.index,
      end: this.index,
      lineStart: this.line,
      lineEnd: this.line,
      columnStart: this.column,
      columnEnd: this.column
    };
  }

  isOver() {
    return this.index >= this.end;
  }

  currentChar() {
    return this.index < this.end ? this.src[this.index] : '\0';
  }

  nextCharBy(offset) {
    const i = this.index + offset;
    return i < this.end ? this.src[i] : '\0';
  }

  advance() {
    if (this.isOver()) return;

    const ch = this.src[this.index++];
    if (ch === '\n') {
      this.line++;
      this.column = 0;
    } else {
      this.column++;
    }
  }

  skipWhitespace() {
    while (!this.isOver()) {
      // Skip comments
      if (this.nextCharBy(0) === '/' && this.nextCharBy(1) === '/') {
        this.advance();
        this.advance();

        while (!this.isOver() && this.currentChar() !== '\n') {
          this.advance();
        }
      }
      else if (!this.charIsWhitespace(this.currentChar())) {
        break;
      }
      else {
        this.advance();
      }
    }
  }

  match(char, errMsg = null) {
    if (this.currentChar() === char) {
      this.advance();
      return true;
    }

    if (errMsg) throw this.makeError(errMsg);
    return false;
  }

  readWhile(errMsg, isStart, isValid) {
    const ch = this.currentChar();
    if (!isStart.call(this, ch)) {
      if (errMsg) throw this.makeError(errMsg);
      return null;
    }

    const start = this.index;

    while (!this.isOver() && isValid.call(this, this.currentChar())) {
      this.advance();
    }

    return this.src.slice(start, this.index); // 🔥 faster than +=
  }

  readString(errMsg) {
    return this.readWhile(errMsg, this.charIsStringStart, this.charIsString);
  }

  readText(errMsg) {
    return this.readWhile(errMsg, this.charIsText, this.charIsText);
  }

  readInteger(errMsg) {
    return this.readWhile(errMsg, this.charIsNumber, this.charIsNumber);
  }

  readAbsolutePitchName(errMsg) {
    return this.readWhile(errMsg, this.charIsAbsolutePitchName, this.charIsAbsolutePitchName);
  }

  readNoteName(errMsg) {
    return this.readWhile(errMsg, this.charIsNoteName, this.charIsNoteName);
  }

  readChordName(errMsg) {
    return this.readWhile(errMsg, this.charIsChordName, this.charIsChordName);
  }

  readChordKindName(errMsg) {
    return this.readWhile(errMsg, this.charIsChordKindName, this.charIsChordKindName);
  }

  // ---------- Character helpers ----------

  charIsWhitespace(c) {
    return c === ' ' || c === '\t' || c === '\n' || c === '\r';
  }

  charIsStringStart(c) {
    return this.isAlpha(c) || c === '_';
  }

  charIsString(c) {
    return this.isAlphaNumeric(c) || c === '_';
  }

  charIsText(c) {
    return this.isAlpha(c) || c === '_';
  }

  charIsNumber(c) {
    return c >= '0' && c <= '9';
  }

  charIsAbsolutePitchName(c) {
    return (c >= 'A' && c <= 'G') || (c >= 'a' && c <= 'g') || c === '#';
  }

  charIsNoteName(c) {
    return this.charIsAbsolutePitchName(c) || (c >= '1' && c <= '7');
  }

  charIsChordName(c) {
    return this.charIsAbsolutePitchName(c) ||
           'IViv'.includes(c);
  }

  charIsChordKindName(c) {
    return this.isAlphaNumeric(c) || c === '+' || c === '%';
  }

  // ---------- Small helpers ----------

  isAlpha(c) {
    return (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z');
  }

  isAlphaNumeric(c) {
    return this.isAlpha(c) || this.charIsNumber(c);
  }
}
