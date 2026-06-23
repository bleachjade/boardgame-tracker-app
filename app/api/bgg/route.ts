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

    // Added textNodeName so it correctly parses HTML-heavy descriptions
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", textNodeName: "#text" });

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

        // Safely extract description whether it's a string or a text node object
        const rawDesc = typeof game.description === 'string' ? game.description : game.description?.['#text'] || '';

        // Extract Community Polls for Best Players & Age
        let bestPlayers = "";
        let communityAge = "";
        if (game.poll) {
          const polls = Array.isArray(game.poll) ? game.poll : [game.poll];
          
          // Best Players Poll
          const playerPoll = polls.find((p: any) => p['@_name'] === 'suggested_numplayers');
          if (playerPoll && playerPoll.results) {
            let maxBestVotes = 0;
            const resultsArr = Array.isArray(playerPoll.results) ? playerPoll.results : [playerPoll.results];
            resultsArr.forEach((r: any) => {
              const votes = Array.isArray(r.result) ? r.result : [r.result];
              const bestVote = votes.find((v: any) => v['@_value'] === 'Best');
              if (bestVote) {
                const numVotes = parseInt(bestVote['@_numvotes'] || '0');
                if (numVotes > maxBestVotes) {
                  maxBestVotes = numVotes;
                  bestPlayers = r['@_numplayers'];
                }
              }
            });
          }

          // Community Age Poll
          const agePoll = polls.find((p: any) => p['@_name'] === 'suggested_playerage');
          if (agePoll && agePoll.results && agePoll.results.result) {
             let maxVotes = 0;
             const votes = Array.isArray(agePoll.results.result) ? agePoll.results.result : [agePoll.results.result];
             votes.forEach((v: any) => {
                const numVotes = parseInt(v['@_numvotes'] || '0');
                if (numVotes > maxVotes) {
                   maxVotes = numVotes;
                   communityAge = v['@_value'];
                }
             });
          }
        }

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
          communityAge
        };
      });

      allFormattedGames.push(...formattedGames);
    }
    return NextResponse.json(allFormattedGames);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch live BGG statistics' }, { status: 500 });
  }
}