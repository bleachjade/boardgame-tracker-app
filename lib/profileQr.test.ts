import { encodeProfileQr, parseProfileQr } from "./profileQr";

describe("encodeProfileQr", () => {
  it("should encode a complete profile", () => {
    const profile = {
      uid: "user123",
      nickname: "TestUser",
      email: "test@example.com"
    };
    
    const encoded = encodeProfileQr(profile);
    const parsed = JSON.parse(encoded);
    
    expect(parsed.t).toBe("bgt-profile");
    expect(parsed.uid).toBe("user123");
    expect(parsed.nickname).toBe("TestUser");
    expect(parsed.email).toBe("test@example.com");
  });

  it("should handle profile without nickname", () => {
    const profile = {
      uid: "user123",
      email: "test@example.com"
    };
    
    const encoded = encodeProfileQr(profile);
    const parsed = JSON.parse(encoded);
    
    expect(parsed.nickname).toBe("");
  });

  it("should handle profile without email", () => {
    const profile = {
      uid: "user123",
      nickname: "TestUser"
    };
    
    const encoded = encodeProfileQr(profile);
    const parsed = JSON.parse(encoded);
    
    expect(parsed.email).toBe("");
  });

  it("should handle minimal profile", () => {
    const profile = {
      uid: "user123"
    };
    
    const encoded = encodeProfileQr(profile);
    const parsed = JSON.parse(encoded);
    
    expect(parsed.t).toBe("bgt-profile");
    expect(parsed.uid).toBe("user123");
    expect(parsed.nickname).toBe("");
    expect(parsed.email).toBe("");
  });
});

describe("parseProfileQr", () => {
  describe("valid JSON format", () => {
    it("should parse complete profile JSON", () => {
      const json = JSON.stringify({
        t: "bgt-profile",
        uid: "user123",
        nickname: "TestUser",
        email: "test@example.com"
      });
      
      const result = parseProfileQr(json);
      
      expect(result).toEqual({
        uid: "user123",
        email: "test@example.com"
      });
    });

    it("should parse JSON with only uid", () => {
      const json = JSON.stringify({
        t: "bgt-profile",
        uid: "user123"
      });
      
      const result = parseProfileQr(json);
      
      expect(result).toEqual({ uid: "user123" });
    });

    it("should parse JSON with only email", () => {
      const json = JSON.stringify({
        t: "bgt-profile",
        email: "test@example.com"
      });
      
      const result = parseProfileQr(json);
      
      expect(result).toEqual({ email: "test@example.com" });
    });

    it("should handle extra fields gracefully", () => {
      const json = JSON.stringify({
        t: "bgt-profile",
        uid: "user123",
        nickname: "TestUser",
        email: "test@example.com",
        extraField: "ignored"
      });
      
      const result = parseProfileQr(json);
      
      expect(result).toEqual({
        uid: "user123",
        email: "test@example.com"
      });
    });
  });

  describe("fallback formats", () => {
    it("should parse plain email", () => {
      const result = parseProfileQr("test@example.com");
      expect(result).toEqual({ email: "test@example.com" });
    });

    it("should parse email with different casing", () => {
      const result = parseProfileQr("TEST@EXAMPLE.COM");
      expect(result).toEqual({ email: "test@example.com" });
    });

    it("should parse plain UID", () => {
      const result = parseProfileQr("user123456789012345");
      expect(result).toEqual({ uid: "user123456789012345" });
    });

    it("should parse UID with special characters", () => {
      const result = parseProfileQr("user-abc_123");
      expect(result).toEqual({ uid: "user-abc_123" });
    });
  });

  describe("invalid inputs", () => {
    it("should return null for empty string", () => {
      expect(parseProfileQr("")).toBeNull();
    });

    it("should return null for whitespace", () => {
      expect(parseProfileQr("   ")).toBeNull();
    });

    it("should return null for invalid JSON", () => {
      expect(parseProfileQr("not json")).toBeNull();
    });

    it("should return null for JSON without t field", () => {
      expect(parseProfileQr('{"uid": "user123"}')).toBeNull();
    });

    it("should return null for JSON with wrong t value", () => {
      expect(parseProfileQr('{"t": "other", "uid": "user123"}')).toBeNull();
    });

    it("should return null for short strings that look like UIDs", () => {
      expect(parseProfileQr("short")).toBeNull();
    });

    it("should return null for strings without @ that are too short for UID", () => {
      expect(parseProfileQr("notanemail")).toBeNull();
    });
  });
});