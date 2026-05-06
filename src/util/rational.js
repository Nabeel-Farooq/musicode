class Rational {
  constructor(numerator = 0, denominator = 1) {
    if (denominator === 0) throw new Error("Denominator cannot be 0");

    this.numerator = numerator;
    this.denominator = denominator;

    this.normalize();
  }

  static fromMixed(integer, numerator, denominator) {
    return new Rational(
      integer * denominator + numerator,
      denominator
    );
  }

  clone() {
    return new Rational(this.numerator, this.denominator);
  }

  static gcd(a, b) {
    while (b !== 0) {
      [a, b] = [b, a % b];
    }
    return Math.abs(a);
  }

  static lcm(a, b) {
    return (a * b) / Rational.gcd(a, b);
  }

  normalize() {
    if (this.denominator < 0) {
      this.numerator *= -1;
      this.denominator *= -1;
    }

    const gcd = Rational.gcd(this.numerator, this.denominator);

    this.numerator /= gcd;
    this.denominator /= gcd;
  }

  asFloat() {
    return this.numerator / this.denominator;
  }

  toString() {
    const integer = Math.trunc(this.numerator / this.denominator);
    const remainder = Math.abs(this.numerator % this.denominator);

    if (remainder === 0) return `${integer}`;
    if (integer === 0) return `${this.numerator}/${this.denominator}`;

    return `${integer}+${remainder}/${this.denominator}`;
  }

  add(other) {
    const lcm = Rational.lcm(this.denominator, other.denominator);

    const n1 = this.numerator * (lcm / this.denominator);
    const n2 = other.numerator * (lcm / other.denominator);

    this.numerator = n1 + n2;
    this.denominator = lcm;

    this.normalize();
    return this;
  }

  subtract(other) {
    return this.add(other.clone().negate());
  }

  multiply(other) {
    this.numerator *= other.numerator;
    this.denominator *= other.denominator;

    this.normalize();
    return this;
  }

  negate() {
    this.numerator *= -1;
    return this;
  }

  compare(other) {
    const diff =
      this.numerator * other.denominator -
      other.numerator * this.denominator;

    return diff < 0 ? -1 : diff > 0 ? 1 : 0;
  }

  static fromFloat(value, precision = 1000000) {
    const numerator = Math.round(value * precision);
    return new Rational(numerator, precision);
  }
}
