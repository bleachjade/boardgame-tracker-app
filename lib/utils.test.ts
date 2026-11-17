import { calculateScoreString, createMarkup } from "./utils";

describe("calculateScoreString", () => {
  describe("basic arithmetic", () => {
    it("should calculate simple addition", () => {
      expect(calculateScoreString("10 + 5")).toBe(15);
    });

    it("should calculate subtraction", () => {
      expect(calculateScoreString("20 - 8")).toBe(12);
    });

    it("should calculate multiplication", () => {
      expect(calculateScoreString("6 * 7")).toBe(42);
    });

    it("should calculate division", () => {
      expect(calculateScoreString("100 / 4")).toBe(25);
    });

    it("should handle decimal numbers", () => {
      expect(calculateScoreString("10.5 + 5.5")).toBe(16);
    });
  });

  describe("complex expressions", () => {
    it("should respect order of operations", () => {
      expect(calculateScoreString("10 + 5 * 2")).toBe(20);
    });

    it("should handle parentheses", () => {
      expect(calculateScoreString("(10 + 5) * 2")).toBe(30);
    });

    it("should handle nested parentheses", () => {
      expect(calculateScoreString("((2 + 3) * 4) - 5")).toBe(15);
    });

    it("should handle multiple operations", () => {
      expect(calculateScoreString("10 + 5 * 2 - 3 / 1")).toBe(17);
    });
  });

  describe("edge cases", () => {
    it("should return 0 for empty string", () => {
      expect(calculateScoreString("")).toBe(0);
    });

    it("should return 0 for whitespace only", () => {
      expect(calculateScoreString("   ")).toBe(0);
    });

    it("should return 0 for invalid characters only", () => {
      expect(calculateScoreString("abc")).toBe(0);
      expect(calculateScoreString("!@#$")).toBe(0);
    });

    it("should sanitize and calculate mixed valid/invalid input", () => {
      expect(calculateScoreString("10 + abc + 5")).toBe(15);
      expect(calculateScoreString("Score: 10 + 5")).toBe(15);
    });

    it("should handle leading zeros", () => {
      expect(calculateScoreString("010 + 05")).toBe(15);
    });

    it("should return 0 for division by zero", () => {
      expect(calculateScoreString("10 / 0")).toBe(0);
    });

    it("should return 0 for invalid syntax", () => {
      expect(calculateScoreString("10 +")).toBe(0);
      expect(calculateScoreString("10 ++ 5")).toBe(0);
      expect(calculateScoreString("10 * * 5")).toBe(0);
    });

    it("should handle negative numbers", () => {
      expect(calculateScoreString("-10 + 5")).toBe(-5);
      expect(calculateScoreString("10 + -5")).toBe(5);
    });
  });

  describe("real-world score examples", () => {
    it("should calculate board game scores", () => {
      expect(calculateScoreString("12 + 8 + 5 + 3")).toBe(28);
    });

    it("should handle multiplication for bonuses", () => {
      expect(calculateScoreString("10 * 3 + 5")).toBe(35);
    });

    it("should handle complex scoring formulas", () => {
      expect(calculateScoreString("(5 * 2) + (3 * 4) + 10")).toBe(32);
    });
  });
});

describe("createMarkup", () => {
  it("should return default message for empty string", () => {
    expect(createMarkup("")).toEqual({ __html: "No description provided." });
  });

  it("should return default message for null", () => {
    expect(createMarkup(null as any)).toEqual({ __html: "No description provided." });
  });

  it("should return default message for undefined", () => {
    expect(createMarkup(undefined as any)).toEqual({ __html: "No description provided." });
  });

  it("should convert HTML entities", () => {
    const input = "Line 1&#10;Line 2&#10;Line 3";
    const expected = "Line 1<br/>Line 2<br/>Line 3";
    expect(createMarkup(input)).toEqual({ __html: expected });
  });

  it("should convert em dash entities", () => {
    const input = "This &mdash; that";
    const expected = "This — that";
    expect(createMarkup(input)).toEqual({ __html: expected });
  });

  it("should convert quote entities", () => {
    const input = ""Quoted text"";
    const expected = '"Quoted text"';
    expect(createMarkup(input)).toEqual({ __html: expected });
  });

  it("should handle multiple entity types", () => {
    const input = ""Title"&#10;Description &mdash; with dash";
    const expected = '"Title"<br/>Description — with dash';
    expect(createMarkup(input)).toEqual({ __html: expected });
  });

  it("should not modify plain text", () => {
    const input = "Plain text without entities";
    expect(createMarkup(input)).toEqual({ __html: input });
  });
});