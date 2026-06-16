import { NextResponse } from 'next/server';
import { XMLParser } from 'fast-xml-parser';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ids = searchParams.get('ids');

  if (!ids) {
    return NextResponse.json({ error: 'Missing game IDs' }, { status: 400 });
  }

  try {
    const token = process.env.BGG_API_TOKEN;
    if (!token) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Fetch detailed structural metadata and statistics from BGG
    const response = await fetch(`https://boardgamegeek.com/xmlapi2/thing?id=${ids}&stats=1`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`BGG Thing API responded with status: ${response.status}`);
    }

    const xmlData = await response.text();

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
    });
    
    const parsed = parser.parse(xmlData);
    let items = parsed.items?.item;
    
    if (!items) return NextResponse.json([]);
    if (!Array.isArray(items)) items = [items]; // Normalize singular lookup object into iterable array

    const formattedGames = items.map((game: any) => {
      const names = Array.isArray(game.name) ? game.name : [game.name];
      const primaryName = names.find((n: any) => n['@_type'] === 'primary') || names[0];

      return {
        bggId: String(game['@_id']),
        name: primaryName?.['@_value'] || 'Unknown Game',
        image: game.image || game.thumbnail || '', // text nodes, direct access
        year: game.yearpublished?.['@_value'] || '',
        minPlayers: game.minplayers?.['@_value'] || '',
        maxPlayers: game.maxplayers?.['@_value'] || '',
        playTime: game.playingtime?.['@_value'] || '',
        description: game.description || '',
      };
    });

    return NextResponse.json(formattedGames);
  } catch (error) {
    console.error('BGG Live Details Proxy Error:', error);
    return NextResponse.json({ error: 'Failed to fetch live BGG statistics' }, { status: 500 });
  }
}