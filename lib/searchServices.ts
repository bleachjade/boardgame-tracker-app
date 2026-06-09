export async function searchGamesBGG(query: string) {
  if (!query) return [];

  // 1. Hit our new search proxy to get matching game IDs
  const searchRes = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
  if (!searchRes.ok) throw new Error('Search failed');
  
  const searchData = await searchRes.json();
  if (!searchData || searchData.length === 0) return [];

  // 2. Extract top 12 IDs to prevent overwhelming the BGG API
  const ids = searchData.slice(0, 12).map((item: any) => item.id).join(',');

  // 3. Fetch enriched data (images, playtime, players) using our existing proxy
  const bggResponse = await fetch(`/api/bgg?ids=${ids}`);
  if (!bggResponse.ok) throw new Error('Failed to fetch enriched data');
  
  return await bggResponse.json();
}