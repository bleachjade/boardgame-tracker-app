import { NextResponse } from 'next/server';
import { XMLParser } from 'fast-xml-parser';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const idsParam = searchParams.get('ids');

  if (!idsParam) return NextResponse.json({ error: 'Missing game IDs' }, { status: 400 });

  try {
    const idsArray = idsParam.split(',').filter(Boolean);
    const chunkSize = 20; 
    let allFormattedGames: any[] = [];

    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

    for (let i = 0; i < idsArray.length; i += chunkSize) {
      const chunk = idsArray.slice(i, i + chunkSize).join(',');
      const response = await fetch(`https://boardgamegeek.com/xmlapi2/thing?id=${chunk}&stats=1`, {
        headers: { "User-Agent": "BoardgameTrackerApp/1.0", "Accept": "text/xml, application/xml" }
      });

      if (!response.ok) continue;

      const xmlData = await response.text();
      const parsed = parser.parse(xmlData);
      
      let items = parsed.items?.item;
      if (!items) continue;
      if (!Array.isArray(items)) items = [items];

      const formattedGames = items.map((game: any) => {
        const names = Array.isArray(game.name) ? game.name : [game.name];
        const primaryName = names.find((n: any) => n['@_type'] === 'primary') || names[0];

        const links = Array.isArray(game.link) ? game.link : (game.link ? [game.link] : []);
        const categories = links.filter((l:any) => l['@_type'] === 'boardgamecategory').map((l:any) => l['@_value']).slice(0, 3);
        const mechanics = links.filter((l:any) => l['@_type'] === 'boardgamemechanic').map((l:any) => l['@_value']).slice(0, 3);

        return {
          bggId: String(game['@_id']),
          name: primaryName?.['@_value'] || 'Unknown Game',
          image: game.image || game.thumbnail || '', 
          year: game.yearpublished?.['@_value'] || '',
          minPlayers: game.minplayers?.['@_value'] || '',
          maxPlayers: game.maxplayers?.['@_value'] || '',
          playTime: game.playingtime?.['@_value'] || '',
          description: game.description || '',
          weight: game.statistics?.ratings?.averageweight?.['@_value'] || '0',
          categories,
          mechanics
        };
      });

      allFormattedGames.push(...formattedGames);
    }
    return NextResponse.json(allFormattedGames);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch live BGG statistics' }, { status: 500 });
  }
}