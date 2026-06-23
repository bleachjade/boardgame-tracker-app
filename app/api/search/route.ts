import { NextResponse } from 'next/server';
import { XMLParser } from 'fast-xml-parser';

// Force Next.js to NEVER cache this route
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');

  if (!q) {
    return NextResponse.json({ error: 'Missing search query' }, { status: 400 });
  }

  try {
    const token = process.env.BGG_API_TOKEN;
    if (!token) {
      console.error("Missing BGG_API_TOKEN in environment variables.");
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
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
    
    if (!items) return NextResponse.json([]); 
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

    return NextResponse.json(results);
  } catch (error) {
    console.error('BGG Live Search Proxy Error:', error);
    return NextResponse.json({ error: 'Failed to search live BGG database' }, { status: 500 });
  }
}