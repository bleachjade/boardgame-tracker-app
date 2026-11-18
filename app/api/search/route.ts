import { NextResponse } from 'next/server';
import { XMLParser } from 'fast-xml-parser';
import { unstable_cache } from 'next/cache';

const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=600, s-maxage=3600, stale-while-revalidate=86400',
};

const getCachedSearch = unstable_cache(
  async (q: string) => {
    const token = process.env.BGG_API_TOKEN;
    if (!token) {
      console.error("Missing BGG_API_TOKEN in environment variables.");
      throw new Error('Server configuration error');
    }

    // UPDATED: Added boardgameexpansion to the type filter and cache: 'no-store'
    const response = await fetch(`https://boardgamegeek.com/xmlapi2/search?query=${encodeURIComponent(q)}&type=boardgame,boardgameexpansion`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`BGG Search API responded with status: ${response.status}`);
    }

    const xmlData = await response.text();

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
    });
    
    const parsed = parser.parse(xmlData);
    let items = parsed.items?.item;
    
    if (!items) return []; 
    if (!Array.isArray(items)) items = [items]; 

    const results = items.map((game: any) => {
      const names = Array.isArray(game.name) ? game.name : [game.name];
      const primaryName = names.find((n: any) => n['@_type'] === 'primary') || names[0];

      return {
        id: game['@_id'],
        name: primaryName?.['@_value'] || 'Unknown Game',
        year: game.yearpublished?.['@_value'] || ''
      };
    });

    return results;
  },
  ['bgg-search'],
  { revalidate: 3600, tags: ['bgg'] }
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');

  if (!q) {
    return NextResponse.json({ error: 'Missing search query' }, { status: 400 });
  }

  try {
    const results = await getCachedSearch(q);
    return NextResponse.json(results, { headers: CACHE_HEADERS });
  } catch (error) {
    console.error('BGG Live Search Proxy Error:', error);
    return NextResponse.json({ error: 'Failed to search live BGG database' }, { status: 500 });
  }
}