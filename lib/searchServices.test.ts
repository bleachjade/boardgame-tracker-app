import { searchGamesBGG } from "./searchServices";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

global.fetch = jest.fn();

describe("searchGamesBGG", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return empty array for empty query", async () => {
    const result = await searchGamesBGG("");
    expect(result).toEqual([]);
  });

  it("should return empty array for whitespace query", async () => {
    const result = await searchGamesBGG("   ");
    expect(result).toEqual([]);
  });

  it("should fetch and return search results", async () => {
    const mockSearchResults = [
      { id: "1", name: "Game 1" },
      { id: "2", name: "Game 2" }
    ];
    
    const mockEnrichedResults = [
      { bggId: "1", name: "Game 1", image: "img1.jpg", minPlayers: "2", maxPlayers: "4", playTime: "60", year: "2020", categories: [], mechanics: [], isExpansion: false },
      { bggId: "2", name: "Game 2", image: "img2.jpg", minPlayers: "1", maxPlayers: "5", playTime: "45", year: "2021", categories: [], mechanics: [], isExpansion: false }
    ];

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSearchResults)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockEnrichedResults)
      });

    const result = await searchGamesBGG("wingspan");
    
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(global.fetch).toHaveBeenCalledWith("/api/search?q=wingspan");
    expect(global.fetch).toHaveBeenCalledWith("/api/bgg?ids=1,2");
    expect(result).toEqual(mockEnrichedResults);
  });

  it("should limit to 12 results", async () => {
    const mockSearchResults = Array.from({ length: 20 }, (_, i) => ({ id: String(i + 1), name: `Game ${i + 1}` }));
    const mockEnrichedResults = Array.from({ length: 12 }, (_, i) => ({ 
      bggId: String(i + 1), 
      name: `Game ${i + 1}`, 
      image: `img${i + 1}.jpg`, 
      minPlayers: "2", 
      maxPlayers: "4", 
      playTime: "60", 
      year: "2020", 
      categories: [], 
      mechanics: [], 
      isExpansion: false 
    }));

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSearchResults)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockEnrichedResults)
      });

    const result = await searchGamesBGG("test");
    
    expect(result).toHaveLength(12);
  });

  it("should handle search API error", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500
    });

    await expect(searchGamesBGG("test")).rejects.toThrow("Search failed");
  });

  it("should handle empty search results", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([])
    });

    const result = await searchGamesBGG("nonexistentgame");
    expect(result).toEqual([]);
  });

  it("should handle BGG enrichment API error", async () => {
    const mockSearchResults = [{ id: "1", name: "Game 1" }];
    
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSearchResults)
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500
      });

    await expect(searchGamesBGG("test")).rejects.toThrow("Failed to fetch enriched data");
  });

  it("should properly encode query string", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([])
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([])
      });

    await searchGamesBGG("game & expansion");
    
    expect(global.fetch).toHaveBeenCalledWith("/api/search?q=game%20%26%20expansion");
  });
});