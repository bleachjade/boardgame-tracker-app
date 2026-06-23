import { NextResponse } from 'next/server';
import { XMLParser } from 'fast-xml-parser';

// Force Next.js to NEVER cache this route
export const dynamic = 'force-dynamic';

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

    const response = await fetch(`https://boardgamegeek.com/xmlapi2/thing?id=${ids}&stats=1`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      cache: 'no-store'
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
    if (!Array.isArray(items)) items = [items];

    const formattedGames = items.map((game: any) => {
      const names = Array.isArray(game.name) ? game.name : [game.name];
      const primaryName = names.find((n: any) => n['@_type'] === 'primary') || names[0];

      const links = Array.isArray(game.link) ? game.link : (game.link ? [game.link] : []);
      const categories = links.filter((l:any) => l['@_type'] === 'boardgamecategory').map((l:any) => l['@_value']).slice(0, 3);
      const mechanics = links.filter((l:any) => l['@_type'] === 'boardgamemechanic').map((l:any) => l['@_value']).slice(0, 3);

      const isExpansion = game['@_type'] === 'boardgameexpansion';
      let baseGameId = null;
      if (isExpansion) {
        const inboundLink = links.find((l:any) => l['@_type'] === 'boardgameexpansion' && l['@_inbound'] === 'true');
        if (inboundLink) baseGameId = String(inboundLink['@_id']);
        else {
          const fallbackLink = links.find((l:any) => l['@_type'] === 'boardgameexpansion');
          if (fallbackLink) baseGameId = String(fallbackLink['@_id']);
        }
      }

      let bestPlayers = "";
      let communityAge = "";
      if (game.poll) {
        const polls = Array.isArray(game.poll) ? game.poll : [game.poll];
        const playerPoll = polls.find((p: any) => p['@_name'] === 'suggested_numplayers');
        
        // FIXED: Added ultra-defensive check before searching player votes
        if (playerPoll && playerPoll.results) {
          let maxBestVotes = 0;
          const resultsArr = Array.isArray(playerPoll.results) ? playerPoll.results : [playerPoll.results];
          resultsArr.forEach((r: any) => {
            if (!r || !r.result) return; // Skip if no result node exists
            const votes = Array.isArray(r.result) ? r.result : [r.result];
            
            // Added safe optional chaining (?.) to v
            const bestVote = votes.find((v: any) => v?.['@_value'] === 'Best');
            if (bestVote) {
              const numVotes = parseInt(bestVote['@_numvotes'] || '0');
              if (numVotes > maxBestVotes) {
                maxBestVotes = numVotes;
                bestPlayers = r['@_numplayers'];
              }
            }
          });
        }
        
        const agePoll = polls.find((p: any) => p['@_name'] === 'suggested_playerage');
        
        // FIXED: Added ultra-defensive check before searching age votes
        if (agePoll && agePoll.results && agePoll.results.result) {
            let maxVotes = 0;
            const votes = Array.isArray(agePoll.results.result) ? agePoll.results.result : [agePoll.results.result];
            votes.forEach((v: any) => {
              if (!v) return;
              const numVotes = parseInt(v['@_numvotes'] || '0');
              if (numVotes > maxVotes) { maxVotes = numVotes; communityAge = v['@_value']; }
            });
        }
      }

      const rawDesc = typeof game.description === 'object' ? game.description['#text'] || '' : game.description || '';

      return {
        bggId: String(game['@_id']),
        name: primaryName?.['@_value'] || 'Unknown Game',
        image: game.image || game.thumbnail || '', 
        year: game.yearpublished?.['@_value'] || '',
        minPlayers: game.minplayers?.['@_value'] || '',
        maxPlayers: game.maxplayers?.['@_value'] || '',
        playTime: game.playingtime?.['@_value'] || '',
        minPlayTime: game.minplaytime?.['@_value'] || '',
        maxPlayTime: game.maxplaytime?.['@_value'] || '',
        minAge: game.minage?.['@_value'] || '',
        description: rawDesc,
        weight: game.statistics?.ratings?.averageweight?.['@_value'] || '0',
        categories,
        mechanics,
        bestPlayers,
        communityAge,
        isExpansion,
        baseGameId
      };
    });

    return NextResponse.json(formattedGames);
  } catch (error) {
    console.error('BGG Live Details Proxy Error:', error);
    return NextResponse.json({ error: 'Failed to fetch live BGG statistics' }, { status: 500 });
  }
}