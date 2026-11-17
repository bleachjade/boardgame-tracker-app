import { 
  searchQuerySchema, 
  bggIdsSchema, 
  ruleBotRequestSchema,
  createGameNightSchema,
  logScoreSchema,
  validateRequest
} from "./schemas";

describe("Validation Schemas", () => {
  describe("searchQuerySchema", () => {
    it("should validate valid search query", () => {
      const result = searchQuerySchema.safeParse({ q: "wingspan" });
      expect(result.success).toBe(true);
    });

    it("should reject empty query", () => {
      const result = searchQuerySchema.safeParse({ q: "" });
      expect(result.success).toBe(false);
    });

    it("should reject query too long", () => {
      const result = searchQuerySchema.safeParse({ q: "a".repeat(201) });
      expect(result.success).toBe(false);
    });

    it("should accept max length query", () => {
      const result = searchQuerySchema.safeParse({ q: "a".repeat(200) });
      expect(result.success).toBe(true);
    });
  });

  describe("bggIdsSchema", () => {
    it("should validate valid IDs string", () => {
      const result = bggIdsSchema.safeParse({ ids: "1,2,3" });
      expect(result.success).toBe(true);
    });

    it("should reject empty IDs", () => {
      const result = bggIdsSchema.safeParse({ ids: "" });
      expect(result.success).toBe(false);
    });

    it("should reject too many IDs", () => {
      const result = bggIdsSchema.safeParse({ ids: "a".repeat(2001) });
      expect(result.success).toBe(false);
    });
  });

  describe("ruleBotRequestSchema", () => {
    const validRequest = {
      gameName: "Wingspan",
      question: "How do I play?",
      description: "A game about birds",
      mechanics: ["Worker Placement", "Engine Building"],
      minPlayers: "1",
      maxPlayers: "5",
      playTime: "40-70",
      history: [
        { role: "user" as const, text: "Previous question" },
        { role: "ai" as const, text: "Previous answer" }
      ]
    };

    it("should validate complete valid request", () => {
      const result = ruleBotRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it("should require gameName", () => {
      const result = ruleBotRequestSchema.safeParse({ ...validRequest, gameName: "" });
      expect(result.success).toBe(false);
    });

    it("should require question", () => {
      const result = ruleBotRequestSchema.safeParse({ ...validRequest, question: "" });
      expect(result.success).toBe(false);
    });

    it("should reject too long gameName", () => {
      const result = ruleBotRequestSchema.safeParse({ ...validRequest, gameName: "a".repeat(201) });
      expect(result.success).toBe(false);
    });

    it("should reject too long question", () => {
      const result = ruleBotRequestSchema.safeParse({ ...validRequest, question: "a".repeat(2001) });
      expect(result.success).toBe(false);
    });

    it("should reject too many mechanics", () => {
      const result = ruleBotRequestSchema.safeParse({ ...validRequest, mechanics: Array(21).fill("mechanic") });
      expect(result.success).toBe(false);
    });

    it("should reject too many history items", () => {
      const result = ruleBotRequestSchema.safeParse({ ...validRequest, history: Array(11).fill({ role: "user" as const, text: "q" }) });
      expect(result.success).toBe(false);
    });

    it("should accept optional fields", () => {
      const result = ruleBotRequestSchema.safeParse({
        gameName: "Test",
        question: "How?"
      });
      expect(result.success).toBe(true);
    });
  });

  describe("createGameNightSchema", () => {
    const validGameNight = {
      title: "Game Night",
      date: "2024-01-15",
      time: "19:00",
      location: "My House",
      proposedGames: [
        { id: "1", name: "Wingspan", image: "img.jpg", maxPlayers: "5" }
      ],
      invitedFriends: ["friend1", "friend2"]
    };

    it("should validate complete valid game night", () => {
      const result = createGameNightSchema.safeParse(validGameNight);
      expect(result.success).toBe(true);
    });

    it("should require title", () => {
      const result = createGameNightSchema.safeParse({ ...validGameNight, title: "" });
      expect(result.success).toBe(false);
    });

    it("should require valid date format", () => {
      const result = createGameNightSchema.safeParse({ ...validGameNight, date: "15-01-2024" });
      expect(result.success).toBe(false);
    });

    it("should accept valid date format", () => {
      const result = createGameNightSchema.safeParse({ ...validGameNight, date: "2024-01-15" });
      expect(result.success).toBe(true);
    });

    it("should require at least one proposed game", () => {
      const result = createGameNightSchema.safeParse({ ...validGameNight, proposedGames: [] });
      expect(result.success).toBe(false);
    });

    it("should reject too many proposed games", () => {
      const result = createGameNightSchema.safeParse({ ...validGameNight, proposedGames: Array(11).fill({ id: "1", name: "Game" }) });
      expect(result.success).toBe(false);
    });

    it("should accept optional fields", () => {
      const result = createGameNightSchema.safeParse({
        title: "Test",
        date: "2024-01-15",
        proposedGames: [{ id: "1", name: "Game" }]
      });
      expect(result.success).toBe(true);
    });
  });

  describe("logScoreSchema", () => {
    const validScore = {
      bggId: "12345",
      gameName: "Wingspan",
      players: [
        { name: "Player 1", score: 45, rawExpression: "20 + 15 + 10" },
        { name: "Player 2", score: 38 }
      ],
      isCoop: false,
      playMode: "score" as const
    };

    it("should validate complete valid score", () => {
      const result = logScoreSchema.safeParse(validScore);
      expect(result.success).toBe(true);
    });

    it("should require bggId", () => {
      const result = logScoreSchema.safeParse({ ...validScore, bggId: "" });
      expect(result.success).toBe(false);
    });

    it("should require gameName", () => {
      const result = logScoreSchema.safeParse({ ...validScore, gameName: "" });
      expect(result.success).toBe(false);
    });

    it("should require at least one player", () => {
      const result = logScoreSchema.safeParse({ ...validScore, players: [] });
      expect(result.success).toBe(false);
    });

    it("should reject too many players", () => {
      const result = logScoreSchema.safeParse({ ...validScore, players: Array(11).fill({ name: "P", score: 1 }) });
      expect(result.success).toBe(false);
    });

    it("should require player name", () => {
      const result = logScoreSchema.safeParse({ ...validScore, players: [{ name: "", score: 1 }] });
      expect(result.success).toBe(false);
    });

    it("should validate playMode enum", () => {
      const result = logScoreSchema.safeParse({ ...validScore, playMode: "invalid" });
      expect(result.success).toBe(false);
    });

    it("should accept all valid playModes", () => {
      expect(logScoreSchema.safeParse({ ...validScore, playMode: "score" }).success).toBe(true);
      expect(logScoreSchema.safeParse({ ...validScore, playMode: "winner" }).success).toBe(true);
      expect(logScoreSchema.safeParse({ ...validScore, playMode: "coop" }).success).toBe(true);
    });

    it("should validate coopResult enum when provided", () => {
      expect(logScoreSchema.safeParse({ ...validScore, isCoop: true, coopResult: "win" }).success).toBe(true);
      expect(logScoreSchema.safeParse({ ...validScore, isCoop: true, coopResult: "loss" }).success).toBe(true);
      expect(logScoreSchema.safeParse({ ...validScore, isCoop: true, coopResult: "invalid" }).success).toBe(false);
    });

    it("should accept optional fields", () => {
      const result = logScoreSchema.safeParse({
        bggId: "1",
        gameName: "Test",
        players: [{ name: "P1", score: 10 }],
        isCoop: false,
        playMode: "score"
      });
      expect(result.success).toBe(true);
    });
  });

  describe("validateRequest helper", () => {
    it("should return success with data for valid input", () => {
      const result = validateRequest(searchQuerySchema, { q: "test" });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.q).toBe("test");
    });

    it("should return failure with error message for invalid input", () => {
      const result = validateRequest(searchQuerySchema, { q: "" });
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toContain("Search query is required");
    });
  });
});